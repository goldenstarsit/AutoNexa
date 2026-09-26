import type {
  ExchangeOrderExecutionMode,
  ExchangeOrderRequest,
  ExchangeOrderType,
} from './exchangeOrder';

export interface OrderExecutionPlan {
  mode: ExchangeOrderExecutionMode;
  type: ExchangeOrderType;
  priceRequired: boolean;
}

export function createOrderExecutionPlan(
  request: ExchangeOrderRequest,
): OrderExecutionPlan {
  switch (request.executionMode) {
    case 'makerOnly':
      if (request.type !== 'makerOnly') {
        throw new Error('makerOnly execution requires makerOnly order type');
      }

      if (!request.price) {
        throw new Error('makerOnly execution requires a price');
      }

      return {
        mode: 'makerOnly',
        type: 'makerOnly',
        priceRequired: true,
      };

    case 'takerOnly':
      if (request.type !== 'market') {
        throw new Error('takerOnly execution requires market order type');
      }

      return {
        mode: 'takerOnly',
        type: 'market',
        priceRequired: false,
      };

    case 'hybrid':
      if (request.type !== 'limit' && request.type !== 'market') {
        throw new Error('hybrid execution requires limit or market order type');
      }

      return {
        mode: 'hybrid',
        type: request.type,
        priceRequired: request.type === 'limit',
      };

    default:
      throw new Error(
        `Unsupported order execution mode: ${String(request.executionMode)}`,
      );
  }
}
