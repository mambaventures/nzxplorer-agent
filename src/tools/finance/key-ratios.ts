import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const MetricsListInputSchema = z.object({
  sector: z
    .string()
    .optional()
    .describe("Filter by NZX sector (e.g. 'Energy', 'Healthcare', 'Financial Services')."),
  year: z
    .string()
    .optional()
    .describe("Single year (2024) or range (2020-2024)."),
  sort: z
    .string()
    .optional()
    .describe(
      "Sort by any metric: roe, net_margin, pe_ratio, dividend_yield, ev_to_ebitda, debt_to_equity, revenue_growth, etc. Default: fiscal_year."
    ),
  order: z.enum(['asc', 'desc']).optional().describe("Sort order. Default: desc."),
  latest: z
    .boolean()
    .default(true)
    .describe("If true, returns only the latest year per company (leaderboard mode). Default: true."),
  limit: z.number().default(50).describe("Max results (default: 50, max: 500)."),
});

export const getMetricsList = new DynamicStructuredTool({
  name: 'get_metrics_list',
  description: `Lists financial metrics across all NZX companies — 41 ratios including profitability (margins, ROE, ROIC), leverage (debt/equity), dividends (payout ratio, yield), growth (revenue, profit YoY), and valuation (P/E, P/B, EV/EBITDA). Great for screening, ranking, and sector comparisons.`,
  schema: MetricsListInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      sector: input.sector,
      year: input.year,
      sort: input.sort,
      order: input.order,
      latest: input.latest ? 'true' : 'false',
      limit: input.limit,
    };
    const { data, url } = await callApi('/api/v1/metrics', params);
    return formatToolResult(data.data || data, [url]);
  },
});

const MetricsDetailInputSchema = z.object({
  ticker: z
    .string()
    .describe("NZX ticker symbol (e.g. 'FPH' for Fisher & Paykel Healthcare)."),
  mode: z
    .enum(['snapshot', 'historical'])
    .default('snapshot')
    .describe(
      "'snapshot' for latest metrics with live valuation (P/E, P/B recalculated from current price). 'historical' for all years."
    ),
  year: z
    .string()
    .optional()
    .describe("Single year or range, only used with historical mode."),
});

export const getMetricsDetail = new DynamicStructuredTool({
  name: 'get_metrics_detail',
  description: `Gets detailed financial metrics for a single NZX company. Snapshot mode includes live valuation (P/E, P/B, dividend yield recalculated from current stock price) and price performance (1d, 1w, 1m, YTD, 1y returns, volatility, 52-week range). Historical mode returns all years of calculated ratios.`,
  schema: MetricsDetailInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      mode: input.mode,
      year: input.year,
    };
    const { data, url } = await callApi(`/api/v1/metrics/${ticker}`, params);
    return formatToolResult(data.data || data, [url]);
  },
});

// Keep legacy export name for compatibility with financial-search router
export const getKeyRatios = getMetricsList;
