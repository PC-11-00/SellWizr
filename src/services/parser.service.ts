import * as cheerio from "cheerio";
import {
  ColumnSchema,
  DataType,
  ParsedTable,
  TableRow,
  TableSchema,
} from "../models/schema.model";
import { Logger } from "../utils/logger";
import { BaseService } from "./base/base.service";

export class ParserService extends BaseService {
  constructor() {
    super("ParserService");
  }

  protected async onInitialize(): Promise<void> {
    // No initialization needed
  }

  protected async onDestroy(): Promise<void> {
    // No cleanup needed
  }

  /**
   * Infer data type from a value
   */
  private inferDataType(value: string): DataType {
    const trimmed = value.trim();

    if (!trimmed || trimmed === "" || trimmed === "-" || trimmed === "N/A") {
      return DataType.VARCHAR;
    }

    // Check for boolean
    if (/^(true|false|yes|no)$/i.test(trimmed)) {
      return DataType.BOOLEAN;
    }

    // Check for integer
    if (/^-?\d+$/.test(trimmed.replace(/,/g, ""))) {
      const num = parseInt(trimmed.replace(/,/g, ""));
      if (num > 2147483647 || num < -2147483648) {
        return DataType.BIGINT;
      }
      return DataType.INT;
    }

    // Check for float
    if (/^-?\d+\.\d+$/.test(trimmed.replace(/,/g, ""))) {
      return DataType.FLOAT;
    }

    // Check for date formats
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return DataType.DATE;
    }

    // Timestamp
    if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(:\d{2})?/.test(trimmed)) {
      return DataType.TIMESTAMP;
    }

    // Common date formats
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(trimmed)) {
      return DataType.DATE;
    }

    // Long text
    if (trimmed.length > 255) {
      return DataType.TEXT;
    }

    return DataType.VARCHAR;
  }

  /**
   * Merge data types - choose the most general type
   */
  private mergeDataTypes(type1: DataType, type2: DataType): DataType {
    if (type1 === type2) return type1;

    const priority: { [key in DataType]: number } = {
      [DataType.TEXT]: 8,
      [DataType.VARCHAR]: 7,
      [DataType.FLOAT]: 6,
      [DataType.BIGINT]: 5,
      [DataType.INT]: 4,
      [DataType.TIMESTAMP]: 3,
      [DataType.DATE]: 2,
      [DataType.BOOLEAN]: 1,
    };

    return priority[type1] > priority[type2] ? type1 : type2;
  }

  /**
   * Sanitize column name to be database-friendly
   */
  private sanitizeColumnName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/^(\d)/, "col_$1")
      .substring(0, 64);
  }

  /**
   * Clean cell value
   */
  private cleanValue(value: string): string {
    return value
      .replace(/\s+/g, " ")
      .replace(/\[.*?\]/g, "")
      .trim();
  }

  /**
   * Convert value to appropriate type
   */
  private convertValue(value: string, dataType: DataType): any {
    const cleaned = this.cleanValue(value);

    if (!cleaned || cleaned === "" || cleaned === "-" || cleaned === "N/A") {
      return null;
    }

    switch (dataType) {
      case DataType.INT:
      case DataType.BIGINT:
        return parseInt(cleaned.replace(/,/g, ""));

      case DataType.FLOAT:
        return parseFloat(cleaned.replace(/,/g, ""));

      case DataType.BOOLEAN:
        return /^(true|yes)$/i.test(cleaned);

      case DataType.DATE:
      case DataType.TIMESTAMP:
      case DataType.VARCHAR:
      case DataType.TEXT:
      default:
        return cleaned;
    }
  }

  /**
   * Parse HTML and extract all tables
   */
  parseHtml(html: string): ParsedTable[] {
    this.ensureInitialized();
    const $ = cheerio.load(html);
    const tables: ParsedTable[] = [];

    $("table").each((tableIndex, tableElement) => {
      try {
        Logger.info(`Parsing table ${tableIndex + 1}`);
        const parsedTable = this.parseTable($, tableElement);

        if (parsedTable.rows.length > 0) {
          tables.push(parsedTable);
          Logger.info(
            `Successfully parsed table ${tableIndex + 1} with ${parsedTable.rows.length} rows`,
          );
        }
      } catch (error) {
        Logger.error(`Failed to parse table ${tableIndex + 1}`, error);
      }
    });

    return tables;
  }

  /**
   * Parse a single table element
   */
  private parseTable($: cheerio.CheerioAPI, tableElement: any): ParsedTable {
    const headers: string[] = [];
    const rawRows: string[][] = [];

    // Extract headers
    $(tableElement)
      .find("thead tr, tr")
      .first()
      .find("th, td")
      .each((_, th) => {
        const headerText = $(th).text().trim();
        if (headerText) {
          headers.push(headerText);
        }
      });

    // If no headers found, generate default
    if (headers.length === 0) {
      const firstDataRow = $(tableElement).find("tbody tr, tr").first();
      const cellCount = firstDataRow.find("td, th").length;
      for (let i = 0; i < cellCount; i++) {
        headers.push(`column_${i + 1}`);
      }
    }

    // Extract data rows
    $(tableElement)
      .find("tbody tr, tr")
      .each((rowIndex, row) => {
        const cells: string[] = [];
        $(row)
          .find("td, th")
          .each((_, cell) => {
            cells.push($(cell).text());
          });

        if (cells.length > 0 && cells.some((cell) => cell.trim() !== "")) {
          const isHeaderRow = cells.every(
            (cell, idx) =>
              this.cleanValue(cell).toLowerCase() ===
              headers[idx]?.toLowerCase(),
          );

          if (!isHeaderRow) {
            rawRows.push(cells);
          }
        }
      });

    // Infer schema
    const schema = this.inferSchema(headers, rawRows);

    // Convert rows to objects
    const rows: TableRow[] = rawRows.map((rowCells) => {
      const row: TableRow = {};
      schema.columns.forEach((column, idx) => {
        const value = rowCells[idx] || "";
        row[column.name] = this.convertValue(value, column.type);
      });
      return row;
    });

    return { schema, rows };
  }

  /**
   * Infer schema from headers and data rows
   */
  private inferSchema(headers: string[], rows: string[][]): TableSchema {
    const columns: ColumnSchema[] = [];

    headers.forEach((header, colIndex) => {
      let inferredType: DataType = DataType.VARCHAR;
      let maxLength = 0;

      rows.forEach((row) => {
        if (row[colIndex]) {
          const value = this.cleanValue(row[colIndex]);
          maxLength = Math.max(maxLength, value.length);

          const valueType = this.inferDataType(value);
          inferredType = this.mergeDataTypes(inferredType, valueType);
        }
      });

      columns.push({
        name: this.sanitizeColumnName(header),
        type: inferredType,
        maxLength:
          inferredType === DataType.VARCHAR
            ? Math.max(255, maxLength)
            : undefined,
      });
    });

    return { columns };
  }

  /**
   * Parse HTML and get the first valid table
   */
  parseFirstTable(html: string): ParsedTable | null {
    const tables = this.parseHtml(html);
    return tables.length > 0 ? tables[0] : null;
  }
}
