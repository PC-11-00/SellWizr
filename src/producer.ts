import { ProducerController } from "./controllers/producer.controller";
import { Logger } from "./utils/logger";

async function main() {
  const controller = new ProducerController();

  try {
    // Initialize controller
    await controller.initialize();

    // Execute production pipeline
    await controller.execute();
  } catch (error) {
    Logger.error("Producer failed", error);
    process.exit(1);
  } finally {
    // Cleanup
    await controller.destroy();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  Logger.info("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  Logger.info("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Run the producer
main();
