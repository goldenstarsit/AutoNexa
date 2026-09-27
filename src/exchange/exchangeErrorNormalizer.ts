import { ExchangeHttpError } from './http/exchangeHttpError';
import type { ExchangeError } from './exchangeError';

export function normalizeExchangeError(
  error: unknown,
): ExchangeError {
  if (error instanceof ExchangeHttpError) {
    return normalizeHttpError(error);
  }

  if (error instanceof TypeError) {
    return {
      category: 'network',
      message: error.message,
      retryable: true,
      cause: error,
    };
  }

  if (error instanceof Error) {
    return {
      category: 'unknown',
      message: error.message,
      retryable: false,
      cause: error,
    };
  }

  return {
    category: 'unknown',
    message: String(error),
    retryable: false,
    cause: error,
  };
}

function normalizeHttpError(error: ExchangeHttpError): ExchangeError {
  const category =
    error.status === 401
      ? 'authentication'
      : error.status === 403
        ? 'authorization'
        : error.status === 404
          ? 'notFound'
          : error.status === 429
            ? 'rateLimit'
            : error.status >= 500
              ? 'server'
              : error.status >= 400
                ? 'validation'
                : 'unknown';

  return {
    category,
    message: error.message,
    status: error.status,
    retryable:
      category === 'rateLimit' ||
      category === 'server',
    cause: error.data,
  };
}
