import { Kafka, Producer } from "kafkajs";
import { config } from "../config";
import { KafkaMessage } from "../models/kafka.model";
import { TableRow, TableSchema } from "../models/schema.model";
import { Logger } from "../utils/logger";
import { BaseKafka } from "./base/base.kafka";

export class KafkaProducerService extends BaseKafka {
  private kafka: Kafka;
  private producer: Producer;
  private topic: string;

  constructor() {
    super("KafkaProducer", config.kafka.brokers, config.kafka.clientId);
    this.topic = config.kafka.topic;

    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
      retry: {
        retries: 5,
        initialRetryTime: 300,
        maxRetryTime: 30000,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionalId: undefined,
      idempotent: true,
    });
  }

  protected async onConnect(): Promise<void> {
    await this.producer.connect();
  }

  protected async onDisconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  /**
   * Send a single row to Kafka
   */
  async sendRow(
    schema: TableSchema,
    row: TableRow,
    sourceUrl: string,
  ): Promise<void> {
    this.ensureConnected();

    const message: KafkaMessage = {
      schema,
      row,
      timestamp: Date.now(),
      sourceUrl,
    };

    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: `row_${message.timestamp}_${Math.random()}`,
          value: JSON.stringify(message),
        },
      ],
    });
  }

  /**
   * Send multiple rows to Kafka in batch
   */
  async sendBatch(
    schema: TableSchema,
    rows: TableRow[],
    sourceUrl: string,
  ): Promise<void> {
    this.ensureConnected();

    Logger.info(
      `Sending batch of ${rows.length} rows to Kafka topic: ${this.topic}`,
    );

    const messages = rows.map((row, index) => {
      const message: KafkaMessage = {
        schema,
        row,
        timestamp: Date.now(),
        sourceUrl,
      };

      return {
        key: `row_${message.timestamp}_${index}`,
        value: JSON.stringify(message),
      };
    });

    const result = await this.producer.send({
      topic: this.topic,
      messages,
    });

    Logger.info(`Successfully sent ${rows.length} messages to Kafka`, {
      topic: this.topic,
      partition: result[0]?.partition,
      offset: result[0]?.baseOffset,
    });
  }

  /**
   * Get topic name
   */
  getTopic(): string {
    return this.topic;
  }
}
