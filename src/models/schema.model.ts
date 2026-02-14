export enum DataType {
  INT = "INT",
  BIGINT = "BIGINT",
  FLOAT = "FLOAT",
  VARCHAR = "VARCHAR",
  TEXT = "TEXT",
  DATE = "DATE",
  TIMESTAMP = "TIMESTAMP",
  BOOLEAN = "BOOLEAN",
}

export interface ColumnSchema {
  name: string;
  type: DataType;
  maxLength?: number;
}

export interface TableSchema {
  columns: ColumnSchema[];
}

export interface TableRow {
  [key: string]: any;
}

export interface ParsedTable {
  schema: TableSchema;
  rows: TableRow[];
}
