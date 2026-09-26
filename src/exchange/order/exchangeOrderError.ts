export interface ExchangeOrderErrorData {
  code?: string | number;
  msg?: string;
  message?: string;
}

export function getExchangeOrderErrorData(
  error: unknown,
): ExchangeOrderErrorData | undefined {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('data' in error)
  ) {
    return undefined;
  }

  const data = (error as { data?: unknown }).data;

  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  return data as ExchangeOrderErrorData;
}
