import type { ExchangeOrder, ExchangeOrderRequest } from '../../exchange/exchangeOrder';
import type { ExchangeTrade } from '../../exchange/exchangeTrade';

export interface DcaRuntimeOrderRecord {
  readonly id: string;
  readonly dcaConfigurationId: string;
  readonly dcaCycleId: string;
  readonly dcaOrderId: string;
  readonly level: number;
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
  readonly averageFillPrice?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DcaRuntimeOrderFillRecord {
  readonly id: string;
  readonly dcaRuntimeOrderId: string;
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

export interface DcaRuntimeOrderFillModel {
  readonly id: string;
  readonly dcaRuntimeOrderId: string;
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

export interface DcaRuntimeOrderModel {
  readonly id: string;
  readonly dcaConfigurationId: string;
  readonly dcaCycleId: string;
  readonly dcaOrderId: string;
  readonly level: number;
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
  readonly averageFillPrice?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly fills: readonly DcaRuntimeOrderFillModel[];
}

export interface DcaRuntimeOrderPersistenceModel {
  getByCycleAndLevel(
    cycleId: string,
    level: number,
  ): DcaRuntimeOrderModel | undefined;

  getFills(
    runtimeOrderId: string,
  ): readonly DcaRuntimeOrderFillModel[];

  getFillsByCycle(
    cycleId: string,
  ): readonly DcaRuntimeOrderFillModel[];

  saveOrder(
    configurationId: string,
    cycleId: string,
    dcaOrderId: string,
    level: number,
    order: ExchangeOrder,
    request: ExchangeOrderRequest,
  ): DcaRuntimeOrderModel;

  saveFills(
    runtimeOrderId: string,
    trades: ExchangeTrade[],
  ): readonly DcaRuntimeOrderFillModel[];
}

export interface DcaRuntimeOrderModelSelector {
  getByCycleAndLevel(
    cycleId: string,
    level: number,
  ): DcaRuntimeOrderModel | undefined;

  getFills(runtimeOrderId: string): readonly DcaRuntimeOrderFillModel[];

  getFillsByCycle(cycleId: string): readonly DcaRuntimeOrderFillModel[];
}
