export class Logger {
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  static info(message: string, data?: any): void {
    console.log(
      `[${this.formatTimestamp()}] [INFO] ${message}`,
      data ? JSON.stringify(data, null, 2) : "",
    );
  }

  static error(message: string, error?: any): void {
    console.error(
      `[${this.formatTimestamp()}] [ERROR] ${message}`,
      error?.message || error || "",
    );
    if (error?.stack) {
      console.error(error.stack);
    }
  }

  static warn(message: string, data?: any): void {
    console.warn(
      `[${this.formatTimestamp()}] [WARN] ${message}`,
      data ? JSON.stringify(data, null, 2) : "",
    );
  }

  static debug(message: string, data?: any): void {
    console.debug(
      `[${this.formatTimestamp()}] [DEBUG] ${message}`,
      data ? JSON.stringify(data, null, 2) : "",
    );
  }
}
