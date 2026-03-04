import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const DividendsInputSchema = z.object({
  ticker: z
    .string()
    .describe("NZX ticker symbol (e.g. 'MEL' for Meridian Energy, 'SPK' for Spark)."),
  year: z
    .string()
    .optional()
    .describe("Single year (2024) or range (2020-2024)."),
  type: z
    .string()
    .optional()
    .describe("Comma-separated: 'final', 'interim', 'special'."),
  limit: z.number().default(20).describe('Max results (default: 20, max: 500).'),
});

export const getDividends = new DynamicStructuredTool({
  name: 'get_dividends',
  description: `Retrieves dividend history for an NZX company. Per-dividend records including ex-date, record date, payment date, DPS (cents), imputation %, supplementary dividend, DRP availability, and currency. Also returns a summary with latest DPS, dividend yield, payout ratio, and dividend cover. Use for dividend analysis, yield screening, and income investing research.`,
  schema: DividendsInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      year: input.year,
      type: input.type,
      limit: input.limit,
    };
    const { data, url } = await callApi(`/api/v1/dividends/${ticker}`, params, { cacheable: true });
    return formatToolResult(data.data || data, [url]);
  },
});
