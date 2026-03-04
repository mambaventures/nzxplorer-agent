import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

export const STOCK_PRICE_DESCRIPTION = `
Fetches historical stock prices for NZX-listed companies. Returns daily OHLCV data (open, high, low, close, adjusted_close, volume). For current price snapshot with live valuation metrics, use get_metrics_detail with mode='snapshot' instead.
`.trim();

const StockPriceInputSchema = z.object({
  ticker: z
    .string()
    .describe("NZX ticker symbol (e.g. 'AIR' for Air New Zealand, 'FPH' for Fisher & Paykel Healthcare)."),
  from: z
    .string()
    .optional()
    .describe('Start date (YYYY-MM-DD). Inclusive.'),
  to: z
    .string()
    .optional()
    .describe('End date (YYYY-MM-DD). Inclusive.'),
  days: z
    .number()
    .optional()
    .describe('Fetch last N trading days. Alternative to from/to.'),
  limit: z
    .number()
    .default(30)
    .describe('Maximum number of daily records to return (default: 30, max: 2000).'),
});

export const getStockPrice = new DynamicStructuredTool({
  name: 'get_stock_price',
  description:
    'Fetches stock price history for an NZX ticker. Returns daily OHLCV data. For current price, live P/E, market cap, and performance metrics, use get_metrics_detail instead.',
  schema: StockPriceInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      from: input.from,
      to: input.to,
      days: input.days,
      limit: input.limit,
    };
    const { data, url } = await callApi(`/api/v1/prices/${ticker}`, params, { cacheable: true });
    return formatToolResult(data.data || data, [url]);
  },
});
