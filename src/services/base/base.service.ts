import { Logger } from "../../utils/logger";

/**
 * Base class for all services
 * Provides common functionality like logging, lifecycle management
 */
export abstract class BaseService {
  protected serviceName: string;
  protected isInitialized: boolean = false;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      Logger.warn(`${this.serviceName} already initialized`);
      return;
    }

    Logger.info(`Initializing ${this.serviceName}...`);
    await this.onInitialize();
    this.isInitialized = true;
    Logger.info(`${this.serviceName} initialized successfully`);
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    Logger.info(`Destroying ${this.serviceName}...`);
    await this.onDestroy();
    this.isInitialized = false;
    Logger.info(`${this.serviceName} destroyed successfully`);
  }

  /**
   * Check if service is initialized
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        `${this.serviceName} is not initialized. Call initialize() first.`,
      );
    }
  }

  /**
   * Override this method to implement initialization logic
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Override this method to implement cleanup logic
   */
  protected abstract onDestroy(): Promise<void>;

  /**
   * Get service name
   */
  getName(): string {
    return this.serviceName;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
