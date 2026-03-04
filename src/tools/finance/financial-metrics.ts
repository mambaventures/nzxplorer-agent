import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { AIMessage, ToolCall } from '@langchain/core/messages';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { getCurrentDate } from '../../agent/prompts.js';

export const FINANCIAL_METRICS_DESCRIPTION = `
Intelligent meta-tool for NZX fundamental analysis and financial metrics. Takes a natural language query and routes to financial statements and ratio tools.

## When to Use

- Income statement data (revenue, EBITDA, EBIT, net profit, EPS)
- Balance sheet data (assets, liabilities, equity, net debt, cash)
- Cash flow data (operating, investing, financing, free cash flow)
- Financial ratios (P/E, EV/EBITDA, ROE, ROA, margins, dividend yield — 41 metrics)
- Trend analysis across multiple periods
- Multi-company fundamental comparisons
- Sector screening and ranking by any metric

## When NOT to Use

- Governance scores (use financial_search)
- Insider trades (use financial_search)
- Announcements or news (use financial_search)
- Non-NZX data (use web_search)

## Usage Notes

- Call ONCE with full natural language query
- Handles NZX ticker resolution (Meridian → MEL)
- For "current" metrics, uses snapshot; for "historical", uses time-series
`.trim();

function formatSubToolName(name: string): string {
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

import { getFinancials, getIncomeStatements, getBalanceSheets, getCashFlowStatements, getAllFinancialStatements } from './fundamentals.js';
import { getMetricsList, getMetricsDetail } from './key-ratios.js';

const METRICS_TOOLS: StructuredToolInterface[] = [
  getFinancials,
  getIncomeStatements,
  getBalanceSheets,
  getCashFlowStatements,
  getAllFinancialStatements,
  getMetricsList,
  getMetricsDetail,
];

const METRICS_TOOL_MAP = new Map(METRICS_TOOLS.map(t => [t.name, t]));

function buildRouterPrompt(): string {
  return `You are an NZX fundamental analysis routing assistant.
Current date: ${getCurrentDate()}

Given a query about NZX financial statements or metrics, call the appropriate tool(s).

## Guidelines

1. **Ticker Resolution**: Convert NZ company names to NZX tickers:
   - Air New Zealand → AIR, Meridian → MEL, Spark → SPK, FPH → FPH
   - Contact Energy → CEN, Auckland Airport → AIA, Infratil → IFT, a2 Milk → ATM
   - Mainfreight → MFT, Fletcher Building → FBU, Ryman → RYM, Mercury → MCY

2. **Tool Selection**:
   - For current metrics + live valuation (P/E from today's price) → get_metrics_detail (mode='snapshot')
   - For historical metrics across years → get_metrics_detail (mode='historical')
   - For screening/ranking across all companies → get_metrics_list
   - For revenue, earnings, profitability → get_income_statements
   - For debt, assets, equity, cash → get_balance_sheets
   - For cash flow, FCF → get_cash_flow_statements
   - For all statements at once → get_all_financial_statements
   - For specific statement types → get_financials (with statement param)

3. **Efficiency**:
   - Prefer specific tools over get_all_financial_statements when possible
   - For comparisons, call same tool for each ticker
   - Use reasonable limits

Call the appropriate tool(s) now.`;
}

const FinancialMetricsInputSchema = z.object({
  query: z.string().describe('Natural language query about NZX financial statements or metrics'),
});

export function createFinancialMetrics(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'financial_metrics',
    description: `Intelligent agentic search for NZX fundamental analysis. Routes to financial statements and ratio tools. Use for:
- Income statements (revenue, EBITDA, net profit, EPS)
- Balance sheets (assets, liabilities, equity, net debt)
- Cash flow statements (operating, investing, financing, FCF)
- Financial ratios (P/E, EV/EBITDA, ROE, ROA, margins, dividend yield — 41 metrics)
- Screening across all NZX companies by any metric
- Multi-period trend analysis`,
    schema: FinancialMetricsInputSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      onProgress?.('Analysing...');
      const { response } = await callLlm(input.query, {
        model,
        systemPrompt: buildRouterPrompt(),
        tools: METRICS_TOOLS,
      });
      const aiMessage = response as AIMessage;

      const toolCalls = aiMessage.tool_calls as ToolCall[];
      if (!toolCalls || toolCalls.length === 0) {
        return formatToolResult({ error: 'No tools selected for query' }, []);
      }

      const toolNames = toolCalls.map(tc => formatSubToolName(tc.name));
      onProgress?.(`Fetching from ${toolNames.join(', ')}...`);
      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          try {
            const tool = METRICS_TOOL_MAP.get(tc.name);
            if (!tool) throw new Error(`Tool '${tc.name}' not found`);
            const rawResult = await tool.invoke(tc.args);
            const result = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
            const parsed = JSON.parse(result);
            return { tool: tc.name, args: tc.args, data: parsed.data, sourceUrls: parsed.sourceUrls || [], error: null };
          } catch (error) {
            return { tool: tc.name, args: tc.args, data: null, sourceUrls: [], error: error instanceof Error ? error.message : String(error) };
          }
        })
      );

      const successfulResults = results.filter((r) => r.error === null);
      const failedResults = results.filter((r) => r.error !== null);
      const allUrls = results.flatMap((r) => r.sourceUrls);
      const combinedData: Record<string, unknown> = {};

      for (const result of successfulResults) {
        const ticker = (result.args as Record<string, unknown>).ticker as string | undefined;
        const key = ticker ? `${result.tool}_${ticker}` : result.tool;
        combinedData[key] = result.data;
      }

      if (failedResults.length > 0) {
        combinedData._errors = failedResults.map((r) => ({ tool: r.tool, args: r.args, error: r.error }));
      }

      return formatToolResult(combinedData, allUrls);
    },
  });
}
