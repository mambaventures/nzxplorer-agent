import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { AIMessage, ToolCall } from '@langchain/core/messages';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { getCurrentDate } from '../../agent/prompts.js';

/**
 * Rich description for the financial_search tool.
 */
export const FINANCIAL_SEARCH_DESCRIPTION = `
Intelligent meta-tool for NZX financial data research. Takes a natural language query and automatically routes to appropriate NZXplorer data sources for company financials, governance, insider trades, dividends, earnings, announcements, and more.

## When to Use

- Company overview and details (sector, board, description)
- Company financials (income statements, balance sheets, cash flow statements)
- Financial metrics and ratios (P/E, ROE, dividend yield, EV/EBITDA, margins)
- Governance Risk Scores (0-100, 6 components)
- Insider trading activity (director share transactions)
- Dividend history and analysis (DPS, imputation, yield, payout ratio)
- Earnings results (revenue, profit, guidance direction)
- NZX announcements (full-text search across 64,000+ announcements)
- Stock price history (daily OHLCV)
- Director profiles and board composition
- Multi-company comparisons

## When NOT to Use

- General web searches or non-NZX topics (use web_search)
- Questions that don't require NZX data (answer directly)
- International stocks not listed on the NZX
- Real-time trading or order execution

## Usage Notes

- Call ONCE with the complete natural language query
- For comparisons like "compare AIR vs MEL revenue", pass the full query as-is
- Handles NZX ticker resolution (Air New Zealand -> AIR, Meridian -> MEL)
- Returns structured JSON with source URLs for verification
- All monetary values in NZD thousands unless noted
`.trim();

/** Format snake_case tool name to Title Case for progress messages */
function formatSubToolName(name: string): string {
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Import all NZX tools directly (avoid circular deps with index.ts)
import { getFinancials, getIncomeStatements, getBalanceSheets, getCashFlowStatements, getAllFinancialStatements } from './fundamentals.js';
import { getMetricsList, getMetricsDetail } from './key-ratios.js';
import { getStockPrice } from './stock-price.js';
import { getInsiderTrades } from './insider_trades.js';
import { getGovernanceScores } from './governance.js';
import { searchAnnouncements } from './announcements.js';
import { getDividends } from './dividends.js';
import { getEarnings } from './earnings.js';
import { getCompanies, getCompanyDetail } from './companies.js';
import { getDirectors, getDirectorDetail } from './directors.js';

// All NZX tools available for routing
const FINANCE_TOOLS: StructuredToolInterface[] = [
  getCompanies,
  getCompanyDetail,
  getDirectors,
  getDirectorDetail,
  getStockPrice,
  getFinancials,
  getIncomeStatements,
  getBalanceSheets,
  getCashFlowStatements,
  getAllFinancialStatements,
  getMetricsList,
  getMetricsDetail,
  getGovernanceScores,
  getInsiderTrades,
  getDividends,
  getEarnings,
  searchAnnouncements,
];

const FINANCE_TOOL_MAP = new Map(FINANCE_TOOLS.map(t => [t.name, t]));

function buildRouterPrompt(): string {
  return `You are an NZX financial data routing assistant for the New Zealand Stock Exchange.
Current date: ${getCurrentDate()}

Given a user's natural language query about NZX companies, call the appropriate tool(s).

## Guidelines

1. **Ticker Resolution**: Convert NZ company names to NZX ticker symbols:
   - Air New Zealand → AIR, Meridian Energy → MEL, Spark → SPK, Fisher & Paykel Healthcare → FPH
   - Contact Energy → CEN, Auckland Airport → AIA, Infratil → IFT, a2 Milk → ATM
   - Mainfreight → MFT, Fletcher Building → FBU, Gentrack → GTK, Ryman Healthcare → RYM
   - Mercury NZ → MCY, Genesis Energy → GNE, Chorus → CNU, Port of Tauranga → POT
   - Freightways/Allegro → ALG, Ebos Group → EBO, Summerset → SUM, Skellerup → SKL
   - Sky TV → SKT, Turners Automotive → TRA, Heartland Group → HGH, Serko → SKO
   - Briscoe Group → BGP, KMD Brands → KMD, Vista Group → VGL
   - NZX Limited → NZX, Scales Corporation → SCL, Comvita → CVT, Delegat Group → DGL

2. **Tool Selection**:
   - Company overview/board/description → get_company_detail (include='all' for comprehensive)
   - Finding companies by name/sector → get_companies
   - Director profiles/bios/board seats → get_director_detail or get_directors
   - Current price + live valuation → get_metrics_detail (mode='snapshot')
   - Historical stock prices → get_stock_price
   - Revenue/earnings/profitability → get_income_statements or get_financials
   - Debt/assets/equity → get_balance_sheets
   - Cash flow/FCF → get_cash_flow_statements
   - All financials at once → get_all_financial_statements or get_financials
   - Financial ratios/screening/rankings → get_metrics_list
   - Detailed ratios + live valuation → get_metrics_detail
   - Governance quality → get_governance_scores
   - Insider buying/selling → get_insider_trades
   - Dividend history/yield/payout → get_dividends
   - Earnings results/guidance → get_earnings
   - News/announcements/filings → search_announcements
   - "why did X move" → get_stock_price + search_announcements
   - Comprehensive analysis → get_company_detail(include='all') + get_metrics_detail + get_governance_scores

3. **Efficiency**:
   - Use get_company_detail with include='all' when multiple data types needed for one company
   - Use get_financials (with statement param) instead of separate calls
   - For comparisons, call same tool for each ticker
   - Use reasonable limits

Call the appropriate tool(s) now.`;
}

const FinancialSearchInputSchema = z.object({
  query: z.string().describe('Natural language query about NZX companies and financial data'),
});

export function createFinancialSearch(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'financial_search',
    description: `Intelligent agentic search for NZX financial data. Takes a natural language query and routes to NZXplorer data tools. Use for:
- Company details, directors, board composition
- Company financials (income, balance sheets, cash flow)
- Financial metrics (P/E, ROE, margins, dividend yield, 41 ratios)
- Governance Risk Scores (0-100, 6 components)
- Insider trading (director share transactions)
- Dividend history and analysis
- Earnings results and guidance
- NZX announcements (64K+ full-text searchable)
- Stock price history
- Multi-company comparisons`,
    schema: FinancialSearchInputSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      onProgress?.('Searching NZXplorer...');
      const { response } = await callLlm(input.query, {
        model,
        systemPrompt: buildRouterPrompt(),
        tools: FINANCE_TOOLS,
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
            const tool = FINANCE_TOOL_MAP.get(tc.name);
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
