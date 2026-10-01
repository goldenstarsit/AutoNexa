import type {
  DcaRuntimeOrderModel as DcaRuntimeOrderDomainModel,
  DcaRuntimeOrderFillModel,
} from '../../../domain/strategy/dca/dcaRuntimeOrderModel';
import type {
  DcaRuntimeOrderRecord,
  DcaRuntimeOrderFillRecord,
} from '../dcaOrderRepository';

export class DcaRuntimeOrderModel
  implements DcaRuntimeOrderDomainModel
{
  readonly id: string;
  readonly dcaConfigurationId: string;
  readonly dcaCycleId: string;
  readonly dcaOrderId: string;
  readonly level: number;
  readonly exchangeOrderId: string;
  readonly clientOrderId?: string;
  readonly symbol: string;
  readonly side: DcaRuntimeOrderRecord['side'];
  readonly type: DcaRuntimeOrderRecord['type'];
  readonly executionMode: DcaRuntimeOrderRecord['executionMode'];
  readonly status: DcaRuntimeOrderRecord['status'];
  readonly quantity: string;
  readonly executedQuantity: string;
  readonly requestedPrice?: string;
  readonly averageFillPrice?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly fills: readonly DcaRuntimeOrderFillModel[];

  constructor(
    record: DcaRuntimeOrderRecord,
    fills: readonly DcaRuntimeOrderFillRecord[] = [],
  ) {
    this.id = record.id;
    this.dcaConfigurationId = record.dcaConfigurationId;
    this.dcaCycleId = record.dcaCycleId;
    this.dcaOrderId = record.dcaOrderId;
    this.level = record.level;
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
      dcaRuntimeOrderId: fill.dcaRuntimeOrderId,
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
