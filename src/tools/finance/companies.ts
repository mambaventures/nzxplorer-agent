import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const CompanyListInputSchema = z.object({
  sector: z
    .string()
    .optional()
    .describe("Filter by NZX sector (e.g. 'Energy', 'Healthcare', 'Financial Services', 'Technology')."),
  search: z
    .string()
    .optional()
    .describe("Search by company name or ticker (case-insensitive)."),
  sort: z
    .string()
    .optional()
    .describe("Sort by: ticker, name, sector, market_cap. Default: ticker."),
  limit: z.number().default(50).describe('Max results (default: 50, max: 500).'),
});

export const getCompanies = new DynamicStructuredTool({
  name: 'get_companies',
  description: `Lists NZX-listed companies (130 issuers). Returns ticker, name, sector, market cap, and website. Use for discovery, sector overviews, and finding tickers.`,
  schema: CompanyListInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      sector: input.sector,
      search: input.search,
      sort: input.sort,
      limit: input.limit,
    };
    const { data, url } = await callApi('/api/v1/companies', params);
    return formatToolResult(data.data || data, [url]);
  },
});

const CompanyDetailInputSchema = z.object({
  ticker: z
    .string()
    .describe("NZX ticker symbol (e.g. 'AIR' for Air New Zealand)."),
  include: z
    .string()
    .optional()
    .describe(
      "Comma-separated optional includes: 'directors' (current board), 'financials' (latest 5 years), 'governance' (GRS score + 6 components), 'price' (latest stock price), 'all' (everything). Fetched in parallel."
    ),
});

export const getCompanyDetail = new DynamicStructuredTool({
  name: 'get_company_detail',
  description: `Gets comprehensive detail for a single NZX company. Base response includes name, sector, description. Optionally include directors (current board with roles, independence, bios), financials (5 years), governance score (6-component GRS), and latest stock price. Use 'all' to get everything in one call.`,
  schema: CompanyDetailInputSchema,
  func: async (input) => {
    const ticker = input.ticker.trim().toUpperCase();
    const params: Record<string, string | number | undefined> = {
      include: input.include,
    };
    const { data, url } = await callApi(`/api/v1/companies/${ticker}`, params);
    return formatToolResult(data.data || data, [url]);
  },
});
