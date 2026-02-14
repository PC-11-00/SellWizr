import { config } from "../config";
import { KafkaProducerService } from "../messaging/kafka.producer";
import { HttpService } from "../services/http.service";
import { ParserService } from "../services/parser.service";
import { Logger } from "../utils/logger";

/**
 * Producer Controller
 * Orchestrates the data fetching, parsing, and publishing to Kafka
 */
export class ProducerController {
  private httpService: HttpService;
  private parserService: ParserService;
  private kafkaProducer: KafkaProducerService;

  constructor() {
    this.httpService = new HttpService();
    this.parserService = new ParserService();
    this.kafkaProducer = new KafkaProducerService();
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    Logger.info("=== Initializing Producer Controller ===");

    await this.httpService.initialize();
    await this.parserService.initialize();
    await this.kafkaProducer.connect();

    Logger.info("Producer Controller initialized successfully");
  }

  /**
   * Execute the production pipeline
   */
  async execute(url?: string): Promise<void> {
    const targetUrl = url || config.dataUrl;

    try {
      Logger.info("=== Starting HTML Table Data Production ===");
      Logger.info(`Data URL: ${targetUrl}`);
      Logger.info(`Kafka Topic: ${this.kafkaProducer.getTopic()}`);

      // Fetch HTML from URL
      Logger.info("Fetching HTML from URL...");
      const html = await this.httpService.fetchHtml(targetUrl);
      Logger.info(`Successfully fetched ${html.length} bytes of HTML`);

      // Parse HTML tables
      Logger.info("Parsing HTML tables...");
      const tables = this.parserService.parseHtml(html);
      Logger.info(`Found ${tables.length} tables in HTML`);

      if (tables.length === 0) {
        Logger.warn("No tables found in HTML");
        return;
      }

      // Use the first table
      const selectedTable = tables[0];
      Logger.info(
        `Selected table with ${selectedTable.rows.length} rows and ${selectedTable.schema.columns.length} columns`,
      );
      Logger.info("Schema:", selectedTable.schema);

      // Send rows to Kafka
      Logger.info("Sending rows to Kafka...");
      await this.kafkaProducer.sendBatch(
        selectedTable.schema,
        selectedTable.rows,
        targetUrl,
      );

      Logger.info("=== Production completed successfully ===");
      Logger.info(`Total rows sent: ${selectedTable.rows.length}`);
    } catch (error) {
      Logger.error("Production failed", error);
      throw error;
    }
  }

  /**
   * Cleanup all services
   */
  async destroy(): Promise<void> {
    Logger.info("=== Destroying Producer Controller ===");

    await this.kafkaProducer.disconnect();
    await this.parserService.destroy();
    await this.httpService.destroy();

    Logger.info("Producer Controller destroyed successfully");
  }
}
