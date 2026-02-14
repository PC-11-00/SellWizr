import { KafkaConsumerService } from "../messaging/kafka.consumer";
import { TableRow, TableSchema } from "../models/schema.model";
import { DatabaseService } from "../services/database.service";
import { Logger } from "../utils/logger";

/**
 * Consumer Controller
 * Orchestrates the consumption of messages from Kafka and storage in database
 */
export class ConsumerController {
  private databaseService: DatabaseService;
  private kafkaConsumer: KafkaConsumerService;
  private tableInitialized: boolean = false;

  constructor() {
    this.databaseService = new DatabaseService();
    this.kafkaConsumer = new KafkaConsumerService();
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    Logger.info("=== Initializing Consumer Controller ===");

    await this.databaseService.initialize();
    await this.kafkaConsumer.connect();

    // Set message handler
    this.kafkaConsumer.setMessageHandler(
      async (schema: TableSchema, row: TableRow) => {
        await this.handleMessage(schema, row);
      },
    );

    Logger.info("Consumer Controller initialized successfully");
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(
    schema: TableSchema,
    row: TableRow,
  ): Promise<void> {
    // Initialize table on first message
    if (!this.tableInitialized) {
      await this.databaseService.createTable(schema);
      this.tableInitialized = true;
    }

    // In the actual implementation, rows are buffered in KafkaConsumerService
    // and sent in batches. This method is called once per batch.
    // For now, we'll just log. The actual batch insert happens in the consumer.
  }

  /**
   * Start consuming messages
   */
  async start(): Promise<void> {
    Logger.info("=== Starting Consumer Controller ===");

    // Override the message handler to include batch processing
    this.kafkaConsumer.setMessageHandler(
      async (schema: TableSchema, row: TableRow) => {
        // This won't be called per message, but rather when we manually flush
        // The actual batching is handled by KafkaConsumerService
      },
    );

    // Create a custom handler that processes batches
    const originalHandler = this.kafkaConsumer.setMessageHandler.bind(
      this.kafkaConsumer,
    );

    // Set up batch processing
    this.setupBatchProcessing();

    // Start consuming
    await this.kafkaConsumer.startConsuming();

    Logger.info("Consumer Controller is running");
  }

  /**
   * Setup batch processing for database inserts
   */
  private setupBatchProcessing(): void {
    const messageBuffer: TableRow[] = [];
    let batchCount = 0;

    this.kafkaConsumer.setMessageHandler(
      async (schema: TableSchema, row: TableRow) => {
        // Initialize table on first message
        if (!this.tableInitialized && schema) {
          await this.databaseService.createTable(schema);
          this.tableInitialized = true;
        }

        // Add row to buffer
        messageBuffer.push(row);
        batchCount++;

        // Insert batch when buffer is full
        if (messageBuffer.length >= 100) {
          await this.databaseService.insertBatch([...messageBuffer]);
          Logger.info(
            `Inserted batch of ${messageBuffer.length} rows (total: ${batchCount})`,
          );
          messageBuffer.length = 0; // Clear buffer
        }
      },
    );

    // Periodic flush for remaining messages
    setInterval(async () => {
      if (messageBuffer.length > 0) {
        await this.databaseService.insertBatch([...messageBuffer]);
        Logger.info(
          `Flushed ${messageBuffer.length} remaining rows (total: ${batchCount})`,
        );
        messageBuffer.length = 0;
      }
    }, 5000);
  }

  /**
   * Cleanup all services
   */
  async destroy(): Promise<void> {
    Logger.info("=== Destroying Consumer Controller ===");

    await this.kafkaConsumer.disconnect();
    await this.databaseService.destroy();

    Logger.info("Consumer Controller destroyed successfully");
  }
}
