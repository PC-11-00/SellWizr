import mysql from "mysql2/promise";
import { config } from "../config";
import { DataType, TableRow, TableSchema } from "../models/schema.model";
import { Logger } from "../utils/logger";
import { BaseService } from "./base/base.service";

export class DatabaseService extends BaseService {
  private connection: mysql.Connection | null = null;
  private currentSchema: TableSchema | null = null;

  constructor() {
    super("DatabaseService");
  }

  protected async onInitialize(): Promise<void> {
    Logger.info("Connecting to MySQL database...");

    // First connect without database to create it if needed
    const tempConnection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
    });

    await tempConnection.execute(
      `CREATE DATABASE IF NOT EXISTS ${config.database.database}`,
    );
    await tempConnection.end();

    // Now connect to the database
    this.connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
    });

    Logger.info("Successfully connected to MySQL database");
  }

  protected async onDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  private mapTypeToSQL(dataType: DataType, maxLength?: number): string {
    switch (dataType) {
      case DataType.INT:
        return "INT";
      case DataType.BIGINT:
        return "BIGINT";
      case DataType.FLOAT:
        return "FLOAT";
      case DataType.DATE:
        return "DATE";
      case DataType.TIMESTAMP:
        return "DATETIME";
      case DataType.BOOLEAN:
        return "BOOLEAN";
      case DataType.TEXT:
        return "TEXT";
      case DataType.VARCHAR:
      default:
        return `VARCHAR(${maxLength || 255})`;
    }
  }

  async createTable(schema: TableSchema, tableName?: string): Promise<void> {
    this.ensureInitialized();

    if (!this.connection) {
      throw new Error("Database connection not established");
    }

    const table = tableName || config.database.tableName;

    await this.connection.execute(`DROP TABLE IF EXISTS ${table}`);

    const columns = schema.columns.map((col) => {
      return `\`${col.name}\` ${this.mapTypeToSQL(col.type, col.maxLength)}`;
    });

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${table} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ${columns.join(",\n          ")},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    Logger.info(`Creating table: ${table}`);
    await this.connection.execute(createTableSQL);
    this.currentSchema = schema;
    Logger.info(`Table ${table} created successfully`);
  }

  async insertBatch(rows: TableRow[], tableName?: string): Promise<void> {
    this.ensureInitialized();

    if (!this.connection) {
      throw new Error("Database connection not established");
    }

    if (rows.length === 0) {
      return;
    }

    const table = tableName || config.database.tableName;
    const columns = Object.keys(rows[0]).filter(
      (key) => rows[0][key] !== undefined,
    );
    const columnNames = columns.map((col) => `\`${col}\``).join(", ");

    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    rows.forEach((row) => {
      const rowValues = columns.map((col) =>
        row[col] === undefined ? null : row[col],
      );
      values.push(...rowValues);
      valuePlaceholders.push(`(${columns.map(() => "?").join(", ")})`);
    });

    const sql = `INSERT INTO ${table} (${columnNames}) VALUES ${valuePlaceholders.join(", ")}`;

    Logger.info(`Inserting batch of ${rows.length} rows into ${table}`);
    await this.connection.execute(sql, values);
    Logger.info(`Successfully inserted ${rows.length} rows`);
  }

  async getRowCount(tableName?: string): Promise<number> {
    this.ensureInitialized();

    if (!this.connection) {
      throw new Error("Database connection not established");
    }

    const table = tableName || config.database.tableName;

    try {
      const [rows] = await this.connection.execute(
        `SELECT COUNT(*) as count FROM ${table}`,
      );
      return (rows as any)[0].count;
    } catch (error) {
      Logger.error("Failed to get row count", error);
      return 0;
    }
  }
}
