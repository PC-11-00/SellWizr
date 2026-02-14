import { config } from "./config";
import { HttpService } from "./services/http.service";
import { ParserService } from "./services/parser.service";
import { Logger } from "./utils/logger";

/**
 * Main entry point for running the complete pipeline demo
 * This file can be used for testing or running everything together
 */
async function main() {
  Logger.info("=== HTML Table Data Pipeline Demo ===");
  Logger.info("This is a demonstration/testing script.");
  Logger.info("For production use:");
  Logger.info("  - Run producer: npm run producer");
  Logger.info("  - Run consumer: npm run consumer");
  Logger.info("");

  const httpService = new HttpService();
  const parserService = new ParserService();

  try {
    // Initialize services
    await httpService.initialize();
    await parserService.initialize();

    // Demonstrate fetching and parsing
    Logger.info(`Fetching data from: ${config.dataUrl}`);
    const html = await httpService.fetchHtml(config.dataUrl);

    Logger.info("Parsing HTML tables...");
    const tables = parserService.parseHtml(html);

    Logger.info(`Found ${tables.length} tables`);

    tables.forEach((table, index) => {
      Logger.info(`\nTable ${index + 1}:`);
      Logger.info(`  Rows: ${table.rows.length}`);
      Logger.info(`  Columns: ${table.schema.columns.length}`);
      Logger.info(
        `  Schema:`,
        table.schema.columns.map((c) => ({
          name: c.name,
          type: c.type,
          maxLength: c.maxLength,
        })),
      );

      if (table.rows.length > 0) {
        Logger.info(`  Sample row:`, table.rows[0]);
      }
    });

    Logger.info("\n=== To run the full pipeline ===");
    Logger.info("1. Set up Kafka and MySQL (see README.md)");
    Logger.info("2. Configure .env file");
    Logger.info("3. Run producer: npm run producer");
    Logger.info("4. Run consumer: npm run consumer");

    // Cleanup
    await parserService.destroy();
    await httpService.destroy();
  } catch (error) {
    Logger.error("Failed to run demo", error);
    process.exit(1);
  }
}

main();
