import type { ExchangeOrderStatus } from '../../order/exchangeOrder';

export type MexcOrderStatus =
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'PARTIALLY_CANCELED';

export function normalizeMexcOrderStatus(
  status: MexcOrderStatus,
): ExchangeOrderStatus {
  switch (status) {
    case 'NEW':
      return 'open';
    case 'PARTIALLY_FILLED':
      return 'partiallyFilled';
    case 'FILLED':
      return 'filled';
    case 'CANCELED':
      return 'canceled';
    case 'PARTIALLY_CANCELED':
      return 'partiallyCanceled';
  }
}
