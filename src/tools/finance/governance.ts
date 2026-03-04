import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const GovernanceInputSchema = z.object({
  sector: z
    .string()
    .optional()
    .describe("Filter by NZX sector (e.g. 'Energy', 'Healthcare')."),
  min_score: z
    .number()
    .optional()
    .describe('Minimum governance score (0-100).'),
  max_score: z
    .number()
    .optional()
    .describe('Maximum governance score (0-100).'),
  rating: z
    .string()
    .optional()
    .describe("Filter by rating tier: 'Excellent' (80+), 'Very Good' (70-79), 'Good' (60-69), 'Adequate' (50-59), 'Poor' (40-49), 'Very Poor' (<40)."),
  sort: z
    .string()
    .default('overall_score')
    .describe(
      "Sort by: overall_score, exec_remuneration_score, board_structure_score, shareholder_rights_score, board_effectiveness_score, audit_risk_score, remuneration_disclosure_score."
    ),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().default(50).describe('Max results (default: 50, max: 500).'),
});

export const getGovernanceScores = new DynamicStructuredTool({
  name: 'get_governance_scores',
  description: `Retrieves Governance Risk Scores (GRS v2) for NZX companies. Scored 0-100 across 6 components: Executive Remuneration, Board Structure, Shareholder Rights, Board Effectiveness, Audit & Risk, and Remuneration Disclosure. Rating tiers: Excellent (80+), Very Good (70-79), Good (60-69), Adequate (50-59), Poor (40-49), Very Poor (<40). 130 companies scored.`,
  schema: GovernanceInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      sector: input.sector,
      min_score: input.min_score,
      max_score: input.max_score,
      rating: input.rating,
      sort: input.sort,
      order: input.order,
      limit: input.limit,
    };
    const { data, url } = await callApi('/api/v1/governance', params);
    return formatToolResult(data.data || data, [url]);
  },
});
