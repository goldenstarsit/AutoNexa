import type { ExchangeOrder, ExchangeOrderRequest } from '../../exchange/exchangeOrder';
import type { ExchangeTrade } from '../../exchange/exchangeTrade';

export type DcaExitType = 'stopLoss' | 'takeProfit';

export interface DcaExitOrderRecord {
  readonly id: string;
  readonly dcaConfigurationId: string;
  readonly dcaCycleId: string;
  readonly exitType: DcaExitType;
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

export interface DcaExitOrderFillRecord {
  readonly id: string;
  readonly dcaExitOrderId: string;
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


export interface DcaExitOrderFillModel {
  readonly id: string;
  readonly dcaExitOrderId: string;
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

export interface DcaExitOrderModel {
  readonly id: string;
  readonly dcaConfigurationId: string;
  readonly dcaCycleId: string;
  readonly exitType: DcaExitType;
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
  readonly fills: readonly DcaExitOrderFillModel[];
}

export interface DcaExitOrderPersistenceModel {
  getByCycleAndType(
    cycleId: string,
    exitType: DcaExitType,
  ): DcaExitOrderModel | undefined;

  getFills(
    exitOrderId: string,
  ): readonly DcaExitOrderFillModel[];

  saveOrder(
    configurationId: string,
    cycleId: string,
    exitType: DcaExitType,
    order: ExchangeOrder,
    request: ExchangeOrderRequest,
  ): DcaExitOrderModel;

  saveFills(
    exitOrderId: string,
    trades: ExchangeTrade[],
  ): readonly DcaExitOrderFillModel[];
}

export interface DcaExitOrderModelSelector {
  getByCycleAndType(
    cycleId: string,
    exitType: DcaExitType,
  ): DcaExitOrderModel | undefined;
  getFills(exitOrderId: string): readonly DcaExitOrderFillModel[];
}
