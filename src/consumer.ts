import { config } from "./config";
import { ConsumerController } from "./controllers/consumer.controller";
import { Logger } from "./utils/logger";

async function main() {
  const controller = new ConsumerController();

  try {
    Logger.info("=== Starting HTML Table Data Consumer ===");
    Logger.info(`Kafka Topic: ${config.kafka.topic}`);
    Logger.info(`Database: ${config.database.database}`);
    Logger.info(`Table: ${config.database.tableName}`);

    // Initialize controller
    await controller.initialize();

    // Start consuming
    await controller.start();

    // Keep the process running
    Logger.info("Consumer is running. Press Ctrl+C to stop.");
  } catch (error) {
    Logger.error("Consumer failed", error);
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    Logger.info("Received SIGINT, shutting down gracefully...");
    await controller.destroy();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    Logger.info("Received SIGTERM, shutting down gracefully...");
    await controller.destroy();
    process.exit(0);
  });
}

// Run the consumer
main();
