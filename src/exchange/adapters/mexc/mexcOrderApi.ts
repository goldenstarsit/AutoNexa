import type { ExchangeOrder, ExchangeOrderRequest } from '../../order/exchangeOrder';
import { MexcPrivateApiClient } from './mexcPrivateApiClient';
import { normalizeMexcOrderStatus } from './mexcOrderStatus';

function normalizeMexcOrderType(
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

export interface MexcOrderResponse {
  symbol: string;
  orderId: string;
  clientOrderId?: string;
  transactTime?: number;
  price: string;
  origQty: string;
  executedQty: string;
  status: string;
  type: string;
  side: string;
}

export class MexcOrderApi {
  readonly executionCapabilities = {
    maker: true,
    taker: true,
    hybrid: true,
  };
  constructor(
    private readonly privateApiClient: MexcPrivateApiClient,
  ) {}

  async getOrder(symbol: string, orderId: string): Promise<ExchangeOrder> {
    const response = await this.privateApiClient.request<MexcOrderResponse>(
      'GET',
      '/api/v3/order',
      {
        symbol: symbol.toUpperCase(),
        orderId,
      },
    );

    return {
      orderId: response.orderId,
      clientOrderId: response.clientOrderId,
      symbol: response.symbol,
      side: response.side.toLowerCase() as ExchangeOrder['side'],
      type: normalizeMexcOrderType(response.type),
      status: normalizeMexcOrderStatus(
        response.status as Parameters<typeof normalizeMexcOrderStatus>[0],
      ),
      quantity: response.origQty,
      executedQuantity: response.executedQty,
      price: response.price,
    };
  }

  async cancelOrder(symbol: string, orderId: string): Promise<ExchangeOrder> {
    const response = await this.privateApiClient.request<MexcOrderResponse>(
      'DELETE',
      '/api/v3/order',
      {
        symbol: symbol.toUpperCase(),
        orderId,
      },
    );

    return {
      orderId: response.orderId,
      clientOrderId: response.clientOrderId,
      symbol: response.symbol,
      side: response.side.toLowerCase() as ExchangeOrder['side'],
      type: normalizeMexcOrderType(response.type),
      status: normalizeMexcOrderStatus(
        response.status as Parameters<typeof normalizeMexcOrderStatus>[0],
      ),
      quantity: response.origQty,
      executedQuantity: response.executedQty,
      price: response.price,
    };
  }

  async placeOrder(request: ExchangeOrderRequest): Promise<ExchangeOrder> {
    const response = await this.privateApiClient.request<MexcOrderResponse>(
      'POST',
      '/api/v3/order',
      {
        symbol: request.symbol.toUpperCase(),
        side: request.side.toUpperCase(),
        type: request.type === 'makerOnly' ? 'LIMIT_MAKER' : request.type.toUpperCase(),
        quantity: request.quantity,
        ...(request.price ? { price: request.price } : {}),
        ...(request.clientOrderId
          ? { newClientOrderId: request.clientOrderId }
          : {}),
      },
    );

    return {
      orderId: response.orderId,
      clientOrderId: response.clientOrderId,
      symbol: response.symbol,
      side: response.side.toLowerCase() as ExchangeOrder['side'],
      type: request.type,
      status: normalizeMexcOrderStatus(response.status as Parameters<typeof normalizeMexcOrderStatus>[0]),
      quantity: response.origQty,
      executedQuantity: response.executedQty,
      price: response.price,
    };
  }
}
