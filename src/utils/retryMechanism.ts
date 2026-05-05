export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

export class RetryMechanism {
  private static defaultOptions: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffFactor: 2,
    retryCondition: (error: any) => {
      // Retry on network errors, timeouts, and 5xx server errors
      if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') return true;
      if (error.response?.status >= 500) return true;
      return false;
    },
  };

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt
        if (attempt === config.maxAttempts) {
          break;
        }

        // Check if we should retry this error
        if (!config.retryCondition(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const finalDelay = delay + jitter;

        console.log(`Retry attempt ${attempt} failed, retrying in ${finalDelay.toFixed(0)}ms:`, (error as any).message);

        await this.delay(finalDelay);
      }
    }

    throw lastError;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Convenience function for API calls
export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  return RetryMechanism.withRetry(apiCall, {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    ...options,
  });
}