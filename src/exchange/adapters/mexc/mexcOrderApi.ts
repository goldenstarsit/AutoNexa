import type { ExchangeOrder, ExchangeOrderRequest } from '../../order/exchangeOrder';
import { MexcPrivateApiClient } from './mexcPrivateApiClient';
import { MexcMarketApi } from './mexcMarketApi';
import { mapDefinedMexcSymbolInfo } from './mexcMarketMapper';
import { validateMexcOrder } from './mexcOrderValidator';
import { normalizeMexcOrderStatus } from './mexcOrderStatus';
import {
  normalizeMexcOrderType,
  toMexcOrderType,
} from './mexcOrderType';

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

function normalizeMexcOrderSide(
  side: string,
): ExchangeOrder['side'] {
  switch (side.toUpperCase()) {
    case 'BUY':
      return 'buy';
    case 'SELL':
      return 'sell';
    default:
      throw new Error(`Unsupported MEXC order side: ${side}`);
  }
}

export class MexcOrderApi {
  readonly executionCapabilities = {
    maker: true,
    taker: true,
    hybrid: true,
  };
  constructor(
    private readonly privateApiClient: MexcPrivateApiClient,
    private readonly marketApi: MexcMarketApi,
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
      side: normalizeMexcOrderSide(response.side),
      type: normalizeMexcOrderType(response.type),
      status: normalizeMexcOrderStatus(
        response.status as Parameters<typeof normalizeMexcOrderStatus>[0],
      ),
      quantity: response.origQty,
      executedQuantity: response.executedQty,
      price: response.price,
    };
  }

  async getOpenOrders(symbol?: string): Promise<ExchangeOrder[]> {
    const response = await this.privateApiClient.request<MexcOrderResponse[]>(
      'GET',
      '/api/v3/openOrders',
      {
        ...(symbol ? { symbol: symbol.toUpperCase() } : {}),
      },
    );

    return response.map((order) => ({
      orderId: order.orderId,
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      side: normalizeMexcOrderSide(order.side),
      type: normalizeMexcOrderType(order.type),
      status: normalizeMexcOrderStatus(
        order.status as Parameters<typeof normalizeMexcOrderStatus>[0],
      ),
      quantity: order.origQty,
      executedQuantity: order.executedQty,
      price: order.price,
    }));
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
      side: normalizeMexcOrderSide(response.side),
      type: normalizeMexcOrderType(response.type),
      status: normalizeMexcOrderStatus(
        response.status as Parameters<typeof normalizeMexcOrderStatus>[0],
      ),
      quantity: response.origQty,
      executedQuantity: response.executedQty,
      price: response.price,
    };
  }

  async getOrderHistory(
    symbol: string,
    options?: {
      startTime?: number;
      endTime?: number;
      limit?: number;
    },
  ): Promise<ExchangeOrder[]> {
    const response = await this.privateApiClient.request<MexcOrderResponse[]>(
      'GET',
      '/api/v3/allOrders',
      {
        symbol: symbol.toUpperCase(),
        ...(options?.startTime !== undefined
          ? { startTime: options.startTime }
          : {}),
        ...(options?.endTime !== undefined
          ? { endTime: options.endTime }
          : {}),
        ...(options?.limit !== undefined ? { limit: options.limit } : {}),
      },
    );

    return response.map((order) => ({
      orderId: order.orderId,
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      side: normalizeMexcOrderSide(order.side),
      type: normalizeMexcOrderType(order.type),
      status: normalizeMexcOrderStatus(
        order.status as Parameters<typeof normalizeMexcOrderStatus>[0],
      ),
      quantity: order.origQty,
      executedQuantity: order.executedQty,
      price: order.price,
    }));
  }

  async placeOrder(request: ExchangeOrderRequest): Promise<ExchangeOrder> {
    const symbolInfo = await this.marketApi.getSymbolInfo(request.symbol);

    if (!symbolInfo) {
      throw new Error(`MEXC symbol not found: ${request.symbol.toUpperCase()}`);
    }

    const exchangeSymbolInfo = mapDefinedMexcSymbolInfo(symbolInfo);

    validateMexcOrder(request, exchangeSymbolInfo);
    const response = await this.privateApiClient.request<MexcOrderResponse>(
      'POST',
      '/api/v3/order',
      {
        symbol: request.symbol.toUpperCase(),
        side: request.side.toUpperCase(),
        type: toMexcOrderType(request.type),
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
      side: normalizeMexcOrderSide(response.side),
      type: request.type,
      status: normalizeMexcOrderStatus(response.status as Parameters<typeof normalizeMexcOrderStatus>[0]),
      quantity: response.origQty,
      executedQuantity: response.executedQty,
      price: response.price,
    };
  }
}
