import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const DirectorListInputSchema = z.object({
  search: z
    .string()
    .optional()
    .describe("Search by director name (case-insensitive)."),
  company: z
    .string()
    .optional()
    .describe("Filter by company ticker (e.g. 'AIR'). Combine with current=true for current board only."),
  current: z
    .boolean()
    .optional()
    .describe("If true and company is specified, returns only current directors."),
  limit: z.number().default(50).describe('Max results (default: 50, max: 500).'),
});

export const getDirectors = new DynamicStructuredTool({
  name: 'get_directors',
  description: `Lists NZX company directors (1,330+ in database). Search by name or filter by company ticker. Returns name, slug, and short bio. Use for finding directors, analysing board composition, and identifying overboarded directors.`,
  schema: DirectorListInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      search: input.search,
      company: input.company?.trim().toUpperCase(),
      current: input.current ? 'true' : undefined,
      limit: input.limit,
    };
    const { data, url } = await callApi('/api/v1/directors', params);
    return formatToolResult(data.data || data, [url]);
  },
});

const DirectorDetailInputSchema = z.object({
  slug: z
    .string()
    .describe("Director slug (e.g. 'john-smith'). Get slugs from get_directors."),
  include: z
    .string()
    .optional()
    .describe(
      "Comma-separated: 'trades' (share transactions), 'exec_comp' (executive compensation: base + STI + LTI), 'remuneration' (board/director fees), 'all'. Note: remuneration = board fees, exec_comp = executive pay — they are different."
    ),
});

export const getDirectorDetail = new DynamicStructuredTool({
  name: 'get_director_detail',
  description: `Gets detailed profile for an NZX director. Includes biography, education, career history, professional qualifications, and all current/past board appointments. Optionally include share trades, executive compensation (base + STI + LTI), and board fees. Key distinction: 'remuneration' = board fees, 'exec_comp' = executive pay packages.`,
  schema: DirectorDetailInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      include: input.include,
    };
    const { data, url } = await callApi(`/api/v1/directors/${input.slug}`, params);
    return formatToolResult(data.data || data, [url]);
  },
});
