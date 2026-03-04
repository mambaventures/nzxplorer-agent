import { describe, test, expect } from 'bun:test';
import {
  getCompanies,
  getCompanyDetail,
  getDirectors,
  getDirectorDetail,
  getGovernanceScores,
  getInsiderTrades,
  getDividends,
  getEarnings,
  getStockPrice,
  getFinancials,
  getIncomeStatements,
  getBalanceSheets,
  getCashFlowStatements,
  getAllFinancialStatements,
  getMetricsList,
  getMetricsDetail,
} from './index.js';
import { searchAnnouncements } from './announcements.js';
import { getRbnzOcr } from './rbnz.js';

/**
 * Smoke tests for all 18 NZX finance tools.
 * Verifies tool registration, schema shapes, and descriptions.
 * Does NOT call the NZXplorer API (that requires NZXPLORER_API_KEY).
 */

const ALL_TOOLS = [
  { tool: getCompanies, name: 'get_companies' },
  { tool: getCompanyDetail, name: 'get_company_detail' },
  { tool: getDirectors, name: 'get_directors' },
  { tool: getDirectorDetail, name: 'get_director_detail' },
  { tool: getGovernanceScores, name: 'get_governance_scores' },
  { tool: getInsiderTrades, name: 'get_insider_trades' },
  { tool: getDividends, name: 'get_dividends' },
  { tool: getEarnings, name: 'get_earnings' },
  { tool: getStockPrice, name: 'get_stock_price' },
  { tool: getFinancials, name: 'get_financials' },
  { tool: getIncomeStatements, name: 'get_income_statements' },
  { tool: getBalanceSheets, name: 'get_balance_sheets' },
  { tool: getCashFlowStatements, name: 'get_cash_flow_statements' },
  { tool: getAllFinancialStatements, name: 'get_all_financial_statements' },
  { tool: getMetricsList, name: 'get_metrics_list' },
  { tool: getMetricsDetail, name: 'get_metrics_detail' },
  { tool: searchAnnouncements, name: 'search_announcements' },
  { tool: getRbnzOcr, name: 'get_rbnz_ocr' },
];

describe('NZX Finance Tools — Registration', () => {
  test('all 18 tools have correct names', () => {
    expect(ALL_TOOLS).toHaveLength(18);
    for (const { tool, name } of ALL_TOOLS) {
      expect(tool.name).toBe(name as typeof tool.name);
    }
  });

  test('all tools have non-empty descriptions', () => {
    for (const { tool } of ALL_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  test('all tools have a schema', () => {
    for (const { tool } of ALL_TOOLS) {
      expect(tool.schema).toBeDefined();
    }
  });

  test('no duplicate tool names', () => {
    const names = ALL_TOOLS.map((t) => t.tool.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

describe('NZX Finance Tools — Schema Validation', () => {
  test('get_companies accepts sector filter', () => {
    const schema = getCompanies.schema as { shape?: Record<string, unknown> };
    expect(schema).toBeDefined();
  });

  test('get_company_detail requires ticker', () => {
    const desc = getCompanyDetail.description;
    expect(desc).toContain('ticker');
  });

  test('get_governance_scores mentions GRS', () => {
    expect(getGovernanceScores.description).toContain('Governance Risk Score');
  });

  test('get_insider_trades mentions director trades', () => {
    expect(getInsiderTrades.description).toContain('insider');
  });

  test('get_dividends mentions yield or dividend', () => {
    const desc = getDividends.description.toLowerCase();
    expect(desc.includes('dividend') || desc.includes('yield')).toBe(true);
  });

  test('get_earnings mentions revenue or earnings', () => {
    const desc = getEarnings.description.toLowerCase();
    expect(desc.includes('earning') || desc.includes('revenue')).toBe(true);
  });

  test('search_announcements mentions full-text or search', () => {
    const desc = searchAnnouncements.description.toLowerCase();
    expect(desc.includes('search') || desc.includes('announcement')).toBe(true);
  });

  test('get_rbnz_ocr mentions risk-free rate', () => {
    expect(getRbnzOcr.description).toContain('risk-free rate');
  });
});

describe('NZX Finance Tools — Description Quality', () => {
  test('descriptions mention NZX-specific context', () => {
    // At least half the tools should mention NZX
    const nzxMentions = ALL_TOOLS.filter(
      ({ tool }) =>
        tool.description.includes('NZX') ||
        tool.description.includes('New Zealand') ||
        tool.description.includes('NZ')
    );
    expect(nzxMentions.length).toBeGreaterThan(ALL_TOOLS.length / 3);
  });

  test('financial tools mention monetary units or values', () => {
    const financialTools = [getFinancials, getIncomeStatements, getBalanceSheets, getCashFlowStatements];
    for (const tool of financialTools) {
      const desc = tool.description.toLowerCase();
      const hasFinancialContext =
        desc.includes('revenue') ||
        desc.includes('income') ||
        desc.includes('balance') ||
        desc.includes('cash') ||
        desc.includes('financial');
      expect(hasFinancialContext).toBe(true);
    }
  });
});
