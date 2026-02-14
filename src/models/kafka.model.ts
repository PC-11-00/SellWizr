import { TableRow, TableSchema } from "./schema.model";

export interface KafkaMessage {
  schema: TableSchema;
  row: TableRow;
  timestamp: number;
  sourceUrl: string;
}

export interface KafkaConfig {
  brokers: string[];
  topic: string;
  clientId: string;
  groupId: string;
}

export interface ProducerOptions {
  batchSize?: number;
  compressionType?: number;
  acks?: number;
}

export interface ConsumerOptions {
  sessionTimeout?: number;
  heartbeatInterval?: number;
  autoCommit?: boolean;
  autoCommitInterval?: number;
}
