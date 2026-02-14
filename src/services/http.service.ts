import axios, { AxiosError } from "axios";
import { config } from "../config";
import { Logger } from "../utils/logger";
import { BaseService } from "./base/base.service";

export class HttpService extends BaseService {
  private maxRetries: number;
  private retryDelay: number;
  private timeout: number;

  constructor() {
    super("HttpService");
    this.maxRetries = config.retry.maxRetries;
    this.retryDelay = config.retry.retryDelayMs;
    this.timeout = config.retry.requestTimeoutMs;
  }

  protected async onInitialize(): Promise<void> {
    // No initialization needed for HTTP client
  }

  protected async onDestroy(): Promise<void> {
    // No cleanup needed for HTTP client
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetriableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors, timeouts
      return true;
    }

    const status = error.response.status;
    // Retry on 5xx server errors and 429 (rate limit)
    return status >= 500 || status === 429;
  }

  async fetchHtml(url: string): Promise<string> {
    this.ensureInitialized();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        Logger.info(
          `Fetching URL (attempt ${attempt}/${this.maxRetries}): ${url}`,
        );

        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; DataScraper/1.0)",
          },
        });

        Logger.info(`Successfully fetched URL: ${url}`);
        return response.data;
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        if (attempt === this.maxRetries) {
          Logger.error(
            `Failed to fetch URL after ${this.maxRetries} attempts`,
            error,
          );
          break;
        }

        if (!this.isRetriableError(axiosError)) {
          Logger.error(
            `Non-retriable error occurred: ${axiosError.message}`,
            error,
          );
          throw error;
        }

        const delay = this.retryDelay * attempt; // Exponential backoff
        Logger.warn(`Request failed, retrying in ${delay}ms...`, {
          attempt,
          error: axiosError.message,
        });

        await this.sleep(delay);
      }
    }

    throw new Error(
      `Failed to fetch URL after ${this.maxRetries} attempts: ${lastError?.message}`,
    );
  }
}
