import type { ExchangeError } from './exchangeError';

export interface ExchangeRetryPolicy {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

export interface ExchangeRetryDecision {
  retry: boolean;
  delayMs: number;
}

export interface ExchangeRetryController {
  shouldRetry(
    error: ExchangeError,
    attempt: number,
  ): ExchangeRetryDecision;
}
