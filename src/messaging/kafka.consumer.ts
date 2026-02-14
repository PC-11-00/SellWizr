import { Consumer, EachMessagePayload, Kafka } from "kafkajs";
import { config } from "../config";
import { KafkaMessage } from "../models/kafka.model";
import { TableRow, TableSchema } from "../models/schema.model";
import { Logger } from "../utils/logger";
import { BaseKafka } from "./base/base.kafka";

export type MessageHandler = (
  schema: TableSchema,
  row: TableRow,
) => Promise<void>;

export class KafkaConsumerService extends BaseKafka {
  private kafka: Kafka;
  private consumer: Consumer;
  private topic: string;
  private groupId: string;
  private messageHandler: MessageHandler | null = null;
  private messageBuffer: TableRow[] = [];
  private currentSchema: TableSchema | null = null;
  private batchSize: number;

  constructor() {
    super("KafkaConsumer", config.kafka.brokers, config.kafka.clientId);
    this.topic = config.kafka.topic;
    this.groupId = config.kafka.groupId;
    this.batchSize = config.batchSize;

    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
      retry: {
        retries: 5,
        initialRetryTime: 300,
        maxRetryTime: 30000,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: this.groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  protected async onConnect(): Promise<void> {
    await this.consumer.connect();
  }

  protected async onDisconnect(): Promise<void> {
    // Flush remaining messages
    if (
      this.messageBuffer.length > 0 &&
      this.messageHandler &&
      this.currentSchema
    ) {
      await this.flushBuffer();
    }

    await this.consumer.disconnect();
  }

  /**
   * Set message handler for processing messages
   */
  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  /**
   * Flush buffered messages
   */
  private async flushBuffer(): Promise<void> {
    if (
      this.messageBuffer.length === 0 ||
      !this.messageHandler ||
      !this.currentSchema
    ) {
      return;
    }

    Logger.info(`Flushing buffer with ${this.messageBuffer.length} messages`);

    for (const row of this.messageBuffer) {
      await this.messageHandler(this.currentSchema, row);
    }

    Logger.info(`Successfully flushed ${this.messageBuffer.length} messages`);
    this.messageBuffer = [];
  }

  /**
   * Process a single message
   */
  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;

    try {
      const kafkaMessage: KafkaMessage = JSON.parse(
        message.value?.toString() || "{}",
      );

      // Store schema if not set
      if (!this.currentSchema && kafkaMessage.schema) {
        this.currentSchema = kafkaMessage.schema;
      }

      // Add to buffer
      this.messageBuffer.push(kafkaMessage.row);

      // Flush if buffer reaches batch size
      if (this.messageBuffer.length >= this.batchSize && this.messageHandler) {
        await this.flushBuffer();
      }

      Logger.debug(
        `Processed message, buffer size: ${this.messageBuffer.length}`,
      );
    } catch (error) {
      Logger.error("Failed to process message", error);
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  async startConsuming(): Promise<void> {
    this.ensureConnected();

    if (!this.messageHandler) {
      throw new Error(
        "Message handler not set. Call setMessageHandler() first.",
      );
    }

    Logger.info(`Subscribing to topic: ${this.topic}`);
    await this.consumer.subscribe({
      topic: this.topic,
      fromBeginning: true,
    });

    Logger.info("Starting to consume messages...");
    await this.consumer.run({
      eachMessage: async (payload: any) => {
        await this.handleMessage(payload);
      },
      autoCommit: true,
      autoCommitInterval: 5000,
    });

    // Set up periodic flush
    setInterval(async () => {
      if (this.messageBuffer.length > 0 && this.messageHandler) {
        await this.flushBuffer();
      }
    }, 5000);

    Logger.info("Consumer is now running");
  }

  /**
   * Get current schema
   */
  getCurrentSchema(): TableSchema | null {
    return this.currentSchema;
  }

  /**
   * Get buffer size
   */
  getBufferSize(): number {
    return this.messageBuffer.length;
  }
}
