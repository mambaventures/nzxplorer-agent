import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const InsiderTradesInputSchema = z.object({
  ticker: z
    .string()
    .optional()
    .describe("NZX ticker symbol to filter by (e.g. 'AIR', 'MEL'). If omitted, returns trades across all companies."),
  type: z
    .string()
    .optional()
    .describe("Transaction type filter: 'Buy', 'Sell', 'Exercise', etc."),
  from: z
    .string()
    .optional()
    .describe('Start date filter (YYYY-MM-DD).'),
  to: z
    .string()
    .optional()
    .describe('End date filter (YYYY-MM-DD).'),
  director: z
    .string()
    .optional()
    .describe("Filter by director slug (e.g. 'john-smith')."),
  limit: z
    .number()
    .default(20)
    .describe('Maximum number of trades to return (default: 20, max: 500).'),
});

export const getInsiderTrades = new DynamicStructuredTool({
  name: 'get_insider_trades',
  description: `Retrieves insider share transactions (director trades) for NZX companies. Includes director name, transaction type (Buy/Sell/Exercise), shares traded, price per share, total value, and shares held after. Data sourced from NZX SHINTR (Significant Holder in Transaction) announcements. Use to assess insider conviction and sentiment.`,
  schema: InsiderTradesInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      ticker: input.ticker?.trim().toUpperCase(),
      type: input.type,
      from: input.from,
      to: input.to,
      director: input.director,
      limit: input.limit,
    };
    const { data, url } = await callApi('/api/v1/insider-trades', params);
    return formatToolResult(data.data || data, [url]);
  },
});
