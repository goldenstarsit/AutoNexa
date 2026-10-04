import type {
  ExchangeOrder,
  ExchangeOrderRequest,
} from '../../exchange/exchangeOrder';
import type { ExchangeTrade } from '../../exchange/exchangeTrade';

export interface DcaInitialOrderRecord {
  readonly id: string;
  readonly dcaConfigurationId: string;
  readonly dcaCycleId: string;
  readonly exchangeOrderId: string;
  readonly clientOrderId?: string;
  readonly symbol: string;
  readonly side: ExchangeOrder['side'];
  readonly type: ExchangeOrder['type'];
  readonly executionMode: ExchangeOrderRequest['executionMode'];
  readonly status: ExchangeOrder['status'];
  readonly quantity: string;
  readonly executedQuantity: string;
  readonly requestedPrice?: string;
  readonly triggerPrice?: string;
  readonly averageFillPrice?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DcaInitialOrderFillRecord {
  readonly id: string;
  readonly dcaInitialOrderId: string;
  readonly exchangeTradeId: string;
  readonly exchangeOrderId: string;
  readonly symbol: string;
  readonly side: ExchangeTrade['side'];
  readonly price: string;
  readonly quantity: string;
  readonly quoteQuantity: string;
  readonly tradeTimestamp: number;
  readonly createdAt: string;
}

export interface DcaInitialOrderModel extends DcaInitialOrderRecord {
  readonly fills: readonly DcaInitialOrderFillRecord[];
}

export interface DcaInitialOrderPersistenceModel {
  getByCycle(cycleId: string): DcaInitialOrderModel | undefined;
  saveOrder(
    configurationId: string,
    cycleId: string,
    order: ExchangeOrder,
    request: ExchangeOrderRequest,
    triggerPrice: string,
  ): DcaInitialOrderModel;
  updateOrder(
    initialOrderId: string,
    order: ExchangeOrder,
  ): DcaInitialOrderModel;
  getFills(initialOrderId: string): readonly DcaInitialOrderFillRecord[];
  saveFills(
    initialOrderId: string,
    trades: ExchangeTrade[],
  ): readonly DcaInitialOrderFillRecord[];
}
