import type { ExchangeOrder } from '../../../domain/exchange/exchangeOrder';

export function normalizeMexcOrderType(
  type: string,
): ExchangeOrder['type'] {
  switch (type.toUpperCase()) {
    case 'LIMIT':
      return 'limit';
    case 'MARKET':
      return 'market';
    case 'LIMIT_MAKER':
      return 'makerOnly';
    default:
      throw new Error(`Unsupported MEXC order type: ${type}`);
  }
}

export function toMexcOrderType(
  type: ExchangeOrder['type'],
): string {
  switch (type) {
    case 'limit':
      return 'LIMIT';
    case 'market':
      return 'MARKET';
    case 'makerOnly':
      return 'LIMIT_MAKER';
  }
}
