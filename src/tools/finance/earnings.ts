import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const EarningsInputSchema = z.object({
  ticker: z
    .string()
    .describe("NZX ticker symbol (e.g. 'FPH', 'CEN', 'AIR')."),
  year: z
    .string()
    .optional()
    .describe("Single year (2024) or range (2023-2025)."),
  period: z
    .enum(['annual', 'interim'])
    .optional()
    .describe("Filter by period type: 'annual' (full year) or 'interim' (half year)."),
  limit: z.number().default(10).describe('Max results (default: 10, max: 500).'),
});

export const getEarnings = new DynamicStructuredTool({
  name: 'get_earnings',
  description: `Retrieves earnings results extracted from NZX announcement PDFs. Includes revenue, net profit, EBITDA, EBIT, underlying profit, EPS, DPS, plus guidance direction (up/down/neutral) and prior period comparisons with change percentages. Covers 112 of 130 NZX issuers, 2024-2025. Use for earnings analysis, guidance tracking, and surprise detection.`,
  schema: EarningsInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      year: input.year,
      period: input.period,
      limit: input.limit,
    };
    const { data, url } = await callApi(`/api/v1/earnings/${ticker}`, params, { cacheable: true });
    return formatToolResult(data.data || data, [url]);
  },
});
