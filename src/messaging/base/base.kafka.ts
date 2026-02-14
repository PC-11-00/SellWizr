import { Logger } from "../../utils/logger";

/**
 * Base class for Kafka messaging (Producer and Consumer)
 * Provides common functionality and lifecycle management
 */
export abstract class BaseKafka {
  protected name: string;
  protected isConnected: boolean = false;
  protected brokers: string[];
  protected clientId: string;

  constructor(name: string, brokers: string[], clientId: string) {
    this.name = name;
    this.brokers = brokers;
    this.clientId = clientId;
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      Logger.warn(`${this.name} already connected`);
      return;
    }

    Logger.info(`Connecting ${this.name} to Kafka...`, {
      brokers: this.brokers,
      clientId: this.clientId,
    });

    await this.onConnect();
    this.isConnected = true;
    Logger.info(`${this.name} connected successfully`);
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    Logger.info(`Disconnecting ${this.name}...`);
    await this.onDisconnect();
    this.isConnected = false;
    Logger.info(`${this.name} disconnected successfully`);
  }

  /**
   * Check if connected
   */
  protected ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error(`${this.name} is not connected. Call connect() first.`);
    }
  }

  /**
   * Override this method to implement connection logic
   */
  protected abstract onConnect(): Promise<void>;

  /**
   * Override this method to implement disconnection logic
   */
  protected abstract onDisconnect(): Promise<void>;

  /**
   * Get connection status
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get client name
   */
  getName(): string {
    return this.name;
  }
}
