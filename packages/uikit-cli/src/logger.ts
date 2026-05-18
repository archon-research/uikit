/**
 * Logger interface for structured logging
 */
export interface Logger {
  info(message: string, context?: object): void;
  warn(message: string, context?: object): void;
  error(message: string, context?: object): void;
  debug(message: string, context?: object): void;
}

/**
 * Console logger with optional debug mode
 */
export class ConsoleLogger implements Logger {
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  info(message: string, context?: object): void {
    if (context) {
      console.log(message, context);
    } else {
      console.log(message);
    }
  }

  warn(message: string, context?: object): void {
    if (context) {
      console.warn(`⚠️  ${message}`, context);
    } else {
      console.warn(`⚠️  ${message}`);
    }
  }

  error(message: string, context?: object): void {
    if (context) {
      console.error(`❌ ${message}`, context);
    } else {
      console.error(`❌ ${message}`);
    }
  }

  debug(message: string, context?: object): void {
    if (!this.debugMode) return;

    if (context) {
      console.log(`[DEBUG] ${message}`, context);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}
