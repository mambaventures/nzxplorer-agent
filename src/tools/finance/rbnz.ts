import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../types.js';

/**
 * RBNZ Official Cash Rate (OCR) history.
 * Source: https://www.rbnz.govt.nz/monetary-policy/official-cash-rate-decisions
 *
 * HOW TO UPDATE:
 * 1. RBNZ announces OCR decisions on scheduled dates (see UPCOMING_DECISIONS below)
 * 2. After each announcement, add a new entry at the TOP of OCR_HISTORY
 * 3. Update UPCOMING_DECISIONS to remove past dates and add newly announced ones
 * 4. Run `bun test src/tools/finance/rbnz.test.ts` to verify
 *
 * The tool auto-detects staleness: if the most recent decision date has passed
 * without an update, it flags the data as potentially stale.
 *
 * Last updated: 2026-03-04
 */

/** Scheduled RBNZ OCR decision dates (announced ~12 months ahead) */
const UPCOMING_DECISIONS = [
  '2026-04-09',
  '2026-05-28',
  '2026-07-09',
  '2026-08-20',
  '2026-10-08',
  '2026-11-25',
];

const OCR_HISTORY: Array<{ date: string; rate: number; change: number; direction: string }> = [
  // 2025-2026 easing cycle
  { date: '2026-02-19', rate: 2.25, change: 0.00, direction: 'hold' },
  { date: '2025-11-27', rate: 2.25, change: -0.50, direction: 'cut' },
  { date: '2025-10-09', rate: 2.75, change: -0.50, direction: 'cut' },
  { date: '2025-08-20', rate: 3.25, change: -0.25, direction: 'cut' },
  { date: '2025-07-09', rate: 3.50, change: -0.25, direction: 'cut' },
  { date: '2025-05-28', rate: 3.75, change: 0.00, direction: 'hold' },
  { date: '2025-04-09', rate: 3.75, change: -0.25, direction: 'cut' },
  { date: '2025-02-19', rate: 4.00, change: -0.50, direction: 'cut' },
  // 2024 easing begins
  { date: '2024-11-27', rate: 4.50, change: -0.50, direction: 'cut' },
  { date: '2024-10-09', rate: 5.00, change: -0.50, direction: 'cut' },
  { date: '2024-08-14', rate: 5.50, change: -0.25, direction: 'cut' },
  { date: '2024-07-10', rate: 5.75, change: 0.00, direction: 'hold' },
  { date: '2024-05-22', rate: 5.75, change: 0.00, direction: 'hold' },
  { date: '2024-04-10', rate: 5.75, change: 0.00, direction: 'hold' },
  { date: '2024-02-28', rate: 5.75, change: 0.00, direction: 'hold' },
  // 2023 peak
  { date: '2023-11-29', rate: 5.75, change: 0.00, direction: 'hold' },
  { date: '2023-10-04', rate: 5.75, change: 0.00, direction: 'hold' },
  { date: '2023-08-16', rate: 5.75, change: 0.00, direction: 'hold' },
  { date: '2023-07-12', rate: 5.75, change: 0.00, direction: 'hold' },
  { date: '2023-05-24', rate: 5.75, change: 0.25, direction: 'hike' },
  { date: '2023-04-05', rate: 5.50, change: 0.50, direction: 'hike' },
  { date: '2023-02-22', rate: 5.00, change: 0.50, direction: 'hike' },
  // 2022 tightening
  { date: '2022-11-23', rate: 4.50, change: 0.75, direction: 'hike' },
  { date: '2022-10-05', rate: 3.75, change: 0.50, direction: 'hike' },
  { date: '2022-08-17', rate: 3.25, change: 0.50, direction: 'hike' },
  { date: '2022-07-13', rate: 2.75, change: 0.50, direction: 'hike' },
  { date: '2022-05-25', rate: 2.25, change: 0.50, direction: 'hike' },
  { date: '2022-04-13', rate: 1.75, change: 0.50, direction: 'hike' },
  { date: '2022-02-23', rate: 1.25, change: 0.25, direction: 'hike' },
  // 2021 first hikes post-COVID
  { date: '2021-11-24', rate: 1.00, change: 0.25, direction: 'hike' },
  { date: '2021-10-06', rate: 0.75, change: 0.25, direction: 'hike' },
  // COVID emergency cuts
  { date: '2020-03-16', rate: 0.50, change: -0.75, direction: 'cut' },
  { date: '2020-03-16', rate: 0.25, change: -0.50, direction: 'cut' },
];

function getCurrentOCR() {
  return OCR_HISTORY[0];
}

const RbnzInputSchema = z.object({
  include_history: z
    .boolean()
    .default(false)
    .describe('Include full OCR decision history (default: false, returns current rate only).'),
  years: z
    .number()
    .optional()
    .describe('Limit history to last N years (e.g., 2 for 2-year history).'),
});

export const getRbnzOcr = new DynamicStructuredTool({
  name: 'get_rbnz_ocr',
  description: `Retrieves the current RBNZ Official Cash Rate (OCR) and optionally the full decision history. The OCR is the risk-free rate for NZ DCF valuations.

Current OCR: ${getCurrentOCR().rate}% (as of ${getCurrentOCR().date}).

Use this tool when you need:
- The risk-free rate for DCF/WACC calculations
- OCR history to understand the rate cycle
- Context for NZ monetary policy impact on companies`,
  schema: RbnzInputSchema,
  func: async (input) => {
    const current = getCurrentOCR();
    const today = new Date().toISOString().slice(0, 10);

    // Find next upcoming decision
    const nextDecision = UPCOMING_DECISIONS.find((d) => d > today);

    // Check if a decision date has passed that we don't have data for
    const pastUnrecorded = UPCOMING_DECISIONS.find(
      (d) => d <= today && d > current.date
    );

    const result: Record<string, unknown> = {
      current_ocr: current.rate,
      current_ocr_pct: `${current.rate}%`,
      last_decision_date: current.date,
      last_decision_direction: current.direction,
      next_decision_date: nextDecision || 'unknown — update UPCOMING_DECISIONS',
      peak_this_cycle: 5.75,
      peak_date: '2023-05-24',
      trough_this_cycle: 0.25,
      trough_date: '2020-03-16',
      note: 'Use OCR as risk-free rate proxy for NZ DCF valuations. Add 5.5-6.5% NZ equity risk premium for cost of equity.',
    };

    if (pastUnrecorded) {
      result.stale_warning = `⚠️ An OCR decision was scheduled for ${pastUnrecorded} but this data has not been updated. The rate shown (${current.rate}%) may be outdated. Use web_search to verify the current OCR.`;
    }

    if (input.include_history) {
      let history = OCR_HISTORY;
      if (input.years) {
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - input.years);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        history = history.filter((h) => h.date >= cutoffStr);
      }
      result.decision_history = history;
      result.total_decisions = history.length;
    }

    return formatToolResult(result, ['https://www.rbnz.govt.nz/monetary-policy/official-cash-rate-decisions']);
  },
});

export const RBNZ_OCR_DESCRIPTION = `
Retrieves the current RBNZ Official Cash Rate (OCR) — the benchmark interest rate for New Zealand.

## When to Use
- DCF valuations (OCR = risk-free rate proxy for NZ)
- WACC calculations
- Understanding NZ monetary policy impact
- Rate cycle analysis

## Current Rate
${getCurrentOCR().rate}% as of ${getCurrentOCR().date}

## Data
- Full OCR decision history (2020-2026)
- Rate, change amount, direction (hike/cut/hold)
- Cycle peak (5.75%) and trough (0.25%)
`.trim();
