import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const FinancialsInputSchema = z.object({
  ticker: z
    .string()
    .describe(
      "The NZX ticker symbol. For example, 'AIR' for Air New Zealand, 'MEL' for Meridian Energy, 'SPK' for Spark."
    ),
  statement: z
    .string()
    .optional()
    .describe(
      "Comma-separated statement types: 'income', 'balance', 'cashflow', 'ratios'. Defaults to all."
    ),
  year: z
    .string()
    .optional()
    .describe("Single year (2024) or range (2020-2024) to filter by fiscal year."),
  limit: z
    .number()
    .default(5)
    .describe('Maximum number of periods to return (default: 5).'),
});

export const getFinancials = new DynamicStructuredTool({
  name: 'get_financials',
  description: `Retrieves normalised financial statements for an NZX company — income statements, balance sheets, cash flow statements, and/or 41 calculated ratios. All monetary values in NZD thousands. Use for revenue, profit, debt, cash flow, margins, ROE, ROIC, leverage, and growth analysis.`,
  schema: FinancialsInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      limit: input.limit,
      statement: input.statement,
      year: input.year,
    };
    const { data, url } = await callApi(`/api/v1/financials/${ticker}`, params, { cacheable: true });
    return formatToolResult(data.data || data, [url]);
  },
});

export const getIncomeStatements = new DynamicStructuredTool({
  name: 'get_income_statements',
  description: `Fetches income statements for an NZX company (revenue, EBITDA, EBIT, net profit, EPS, DPS). All monetary values in NZD thousands, EPS/DPS in cents.`,
  schema: FinancialsInputSchema.omit({ statement: true }),
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      statement: 'income',
      limit: input.limit,
      year: input.year,
    };
    const { data, url } = await callApi(`/api/v1/financials/${ticker}`, params, { cacheable: true });
    const responseData = (data.data as Record<string, unknown>) || data;
    return formatToolResult(responseData.income || responseData, [url]);
  },
});

export const getBalanceSheets = new DynamicStructuredTool({
  name: 'get_balance_sheets',
  description: `Retrieves balance sheets for an NZX company (total assets, liabilities, equity, net debt, cash). All monetary values in NZD thousands.`,
  schema: FinancialsInputSchema.omit({ statement: true }),
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      statement: 'balance',
      limit: input.limit,
      year: input.year,
    };
    const { data, url } = await callApi(`/api/v1/financials/${ticker}`, params, { cacheable: true });
    const responseData = (data.data as Record<string, unknown>) || data;
    return formatToolResult(responseData.balance || responseData, [url]);
  },
});

export const getCashFlowStatements = new DynamicStructuredTool({
  name: 'get_cash_flow_statements',
  description: `Retrieves cash flow statements for an NZX company (operating, investing, financing cash flows, free cash flow). All monetary values in NZD thousands.`,
  schema: FinancialsInputSchema.omit({ statement: true }),
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      statement: 'cashflow',
      limit: input.limit,
      year: input.year,
    };
    const { data, url } = await callApi(`/api/v1/financials/${ticker}`, params, { cacheable: true });
    const responseData = (data.data as Record<string, unknown>) || data;
    return formatToolResult(responseData.cashflow || responseData, [url]);
  },
});

export const getAllFinancialStatements = new DynamicStructuredTool({
  name: 'get_all_financial_statements',
  description: `Retrieves all financial statements (income, balance, cashflow, ratios) for an NZX company in one call. More efficient than calling each separately. Returns 41 calculated ratios including profitability, leverage, cash flow quality, dividends, growth, valuation, and composite metrics.`,
  schema: FinancialsInputSchema.omit({ statement: true }),
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      limit: input.limit,
      year: input.year,
    };
    const { data, url } = await callApi(`/api/v1/financials/${ticker}`, params, { cacheable: true });
    return formatToolResult(data.data || data, [url]);
  },
});
