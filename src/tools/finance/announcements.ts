import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const AnnouncementsInputSchema = z.object({
  search: z
    .string()
    .optional()
    .describe(
      "Full-text search query across 64,000+ NZX announcements (2017-2026). Supports natural language. When provided, uses ranked full-text search instead of standard listing."
    ),
  ticker: z
    .string()
    .optional()
    .describe("Filter by NZX ticker symbol (e.g. 'AIR', 'FPH')."),
  type: z
    .string()
    .optional()
    .describe(
      "Filter by announcement type: GENERAL, FLLYR (full year results), HALFYR (half year), SHINTR (insider trade), SECISSUE (capital raise), MEETING (AGM), DVDEND (dividend), MKTUPDTE (market update), BUYBACK, ALLOT, OFFER, PLACE, LISTING, etc."
    ),
  from: z
    .string()
    .optional()
    .describe('Start date (YYYY-MM-DD).'),
  to: z
    .string()
    .optional()
    .describe('End date (YYYY-MM-DD).'),
  limit: z.number().default(20).describe('Max results (default: 20, max: 500).'),
});

export const searchAnnouncements = new DynamicStructuredTool({
  name: 'search_announcements',
  description: `Searches 64,000+ NZX market announcements (2017-2026, 56 types, 129 issuers). Supports full-text search with ranked results OR filtered listing by ticker/type/date. Use for: earnings releases, insider trades, capital raises, AGM notices, dividends, market updates, and any company news or regulatory filings.`,
  schema: AnnouncementsInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      search: input.search,
      ticker: input.ticker?.trim().toUpperCase(),
      type: input.type,
      from: input.from,
      to: input.to,
      limit: input.limit,
    };
    const { data, url } = await callApi('/api/v1/announcements', params);
    return formatToolResult(data.data || data, [url]);
  },
});
