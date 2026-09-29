export interface ExchangeTrade {
  tradeId: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: string;
  quantity: string;
  quoteQuantity: string;
  timestamp: number;
}
