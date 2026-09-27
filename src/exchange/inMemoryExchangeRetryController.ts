import type { ExchangeError } from './exchangeError';
import type {
  ExchangeRetryController,
  ExchangeRetryDecision,
  ExchangeRetryPolicy,
} from './exchangeRetryPolicy';

export class InMemoryExchangeRetryController
  implements ExchangeRetryController
{
  constructor(private readonly policy: ExchangeRetryPolicy) {}

  shouldRetry(
    error: ExchangeError,
    attempt: number,
  ): ExchangeRetryDecision {
    if (!error.retryable || attempt >= this.policy.maxAttempts) {
      return {
        retry: false,
        delayMs: 0,
      };
    }

    return {
      retry: true,
      delayMs:
        this.policy.delayMs *
        this.policy.backoffMultiplier ** Math.max(0, attempt - 1),
    };
  }
}
