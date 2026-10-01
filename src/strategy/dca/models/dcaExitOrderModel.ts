import type {
  DcaExitOrderModel as DcaExitOrderDomainModel,
  DcaExitOrderFillModel,
} from '../../../domain/strategy/dca/dcaExitOrderModel';
import type {
  DcaExitOrderRecord,
  DcaExitOrderFillRecord,
} from '../dcaExitOrderRepository';

export class DcaExitOrderModel implements DcaExitOrderDomainModel {
  readonly id: string;
  readonly dcaConfigurationId: string;
  readonly dcaCycleId: string;
  readonly exitType: DcaExitOrderRecord['exitType'];
  readonly exchangeOrderId: string;
  readonly clientOrderId?: string;
  readonly symbol: string;
  readonly side: DcaExitOrderRecord['side'];
  readonly type: DcaExitOrderRecord['type'];
  readonly executionMode: DcaExitOrderRecord['executionMode'];
  readonly status: DcaExitOrderRecord['status'];
  readonly quantity: string;
  readonly executedQuantity: string;
  readonly requestedPrice?: string;
  readonly averageFillPrice?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly fills: readonly DcaExitOrderFillModel[];

  constructor(
    record: DcaExitOrderRecord,
    fills: readonly DcaExitOrderFillRecord[] = [],
  ) {
    this.id = record.id;
    this.dcaConfigurationId = record.dcaConfigurationId;
    this.dcaCycleId = record.dcaCycleId;
    this.exitType = record.exitType;
    this.exchangeOrderId = record.exchangeOrderId;
    this.clientOrderId = record.clientOrderId;
    this.symbol = record.symbol;
    this.side = record.side;
    this.type = record.type;
    this.executionMode = record.executionMode;
    this.status = record.status;
    this.quantity = record.quantity;
    this.executedQuantity = record.executedQuantity;
    this.requestedPrice = record.requestedPrice;
    this.averageFillPrice = record.averageFillPrice;
    this.createdAt = record.createdAt;
    this.updatedAt = record.updatedAt;
    this.fills = fills.map((fill) => ({
      id: fill.id,
      dcaExitOrderId: fill.dcaExitOrderId,
      exchangeTradeId: fill.exchangeTradeId,
      exchangeOrderId: fill.exchangeOrderId,
      symbol: fill.symbol,
      side: fill.side,
      price: fill.price,
      quantity: fill.quantity,
      quoteQuantity: fill.quoteQuantity,
      tradeTimestamp: fill.tradeTimestamp,
      createdAt: fill.createdAt,
    }));
  }
}
