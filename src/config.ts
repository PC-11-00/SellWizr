import dotenv from "dotenv";

dotenv.config();

export interface Config {
  dataUrl: string;
  kafka: {
    brokers: string[];
    topic: string;
    clientId: string;
    groupId: string;
  };
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    tableName: string;
  };
  retry: {
    maxRetries: number;
    retryDelayMs: number;
    requestTimeoutMs: number;
  };
  batchSize: number;
}

export const config: Config = {
  dataUrl:
    process.env.DATA_URL ||
    "https://en.wikipedia.org/wiki/List_of_countries_by_population_(United_Nations)",
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    topic: process.env.KAFKA_TOPIC || "html-table-data",
    clientId: process.env.KAFKA_CLIENT_ID || "html-table-scraper",
    groupId: process.env.KAFKA_GROUP_ID || "table-consumer-group",
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "table_data",
    tableName: process.env.DB_TABLE_NAME || "extracted_data",
  },
  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES || "3"),
    retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || "1000"),
    requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || "10000"),
  },
  batchSize: parseInt(process.env.BATCH_SIZE || "100"),
};
