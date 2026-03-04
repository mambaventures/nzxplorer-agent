# NZXplorer Agent

AI research assistant for the New Zealand Stock Exchange. Ask any question about NZX-listed companies and get a data-backed answer.

Forked from [Dexter](https://github.com/virattt/dexter) by [@virattt](https://twitter.com/virattt).

## What It Does

The agent has access to the most comprehensive structured dataset on NZX-listed companies:

| Data | Coverage |
|------|----------|
| Companies | 130 NZX issuers |
| Financial statements | Income, balance sheet, cash flow (normalised, multi-year) |
| Financial ratios | 41 metrics across 367 company-years |
| Governance Risk Scores | 0-100, 6 components, all 130 companies |
| Insider trades | 4,100+ director share transactions |
| Dividends | 1,184 per-dividend records with imputation, DRP |
| Earnings results | 389 extracted from PDFs, with guidance direction |
| Announcements | 64,000+ full-text searchable (2017-present) |
| Directors | 1,330+ with bios, board seats, compensation |
| Stock prices | Daily OHLCV, updated automatically |
| AGM resolutions | 1,662 resolutions, 37 failed, voting data |
| Chairman speeches | 996 analysed with Language Intelligence Scores |
| Annual reports | 338 report URLs, 308 extracted |

## Example Queries

```
"Should I buy Air New Zealand?"
"Which NZX stocks have the safest dividends?"
"Compare Spark vs Chorus vs Mercury"
"What's the governance score for Fletcher Building?"
"Show me insider buying in the last 3 months"
"Build a DCF for Fisher & Paykel Healthcare"
"What happened on the NZX this week?"
"Which directors sit on the most boards?"
```

## Prerequisites

- Node.js 18+ or [Bun](https://bun.com) runtime
- An LLM API key (Anthropic, OpenAI, Google, or others)
- NZXplorer API key (get one at [nzxplorer.co.nz/developers](https://nzxplorer.co.nz/developers))
- Web search API key (optional — Exa, Perplexity, or Tavily)

## Install

```bash
git clone https://github.com/mambaventures/nzxplorer-agent.git
cd nzxplorer-agent
npm install    # or: bun install
```

## Configure

```bash
cp env.example .env
```

Edit `.env` with your keys:

```bash
# Required — NZXplorer API
NZXPLORER_API_KEY=your-key

# Required — at least one LLM provider
ANTHROPIC_API_KEY=your-key    # recommended
# OPENAI_API_KEY=your-key     # alternative
# GOOGLE_API_KEY=your-key     # alternative

# Optional — web search for non-NZX questions
# EXASEARCH_API_KEY=your-key
```

## Run

```bash
npm start      # or: bun start
```

Then ask a question.

## Tools

The agent has 17 NZX-specific data tools routed via two meta-tools:

### `financial_search` — routes to all data tools
- `get_companies` / `get_company_detail` — company info, board, description
- `get_directors` / `get_director_detail` — bios, board seats, compensation
- `get_stock_price` — daily OHLCV price history
- `get_financials` — income, balance sheet, cash flow (all-in-one)
- `get_income_statements` / `get_balance_sheets` / `get_cash_flow_statements`
- `get_all_financial_statements` — all three at once
- `get_metrics_list` — screen/rank all companies by 41 ratios
- `get_metrics_detail` — snapshot with live valuation, or historical
- `get_governance_scores` — GRS v2, 6 components, 130 companies
- `get_insider_trades` — director share transactions
- `get_dividends` — per-dividend records with yield/payout
- `get_earnings` — extracted results with guidance direction
- `search_announcements` — full-text search across 64K+ announcements

### `financial_metrics` — focused fundamental analysis
Routes to financial statements and ratio tools specifically.

### Other tools
- `web_search` — general web search (Exa/Perplexity/Tavily)
- `web_fetch` — fetch and read web pages
- `browser` — Playwright-based scraping
- `skill` — extensible workflows (e.g., DCF valuation)

## Skills

Skills are SKILL.md-defined workflows the agent can invoke.

### DCF Valuation (built-in)
Triggered by: "fair value", "intrinsic value", "DCF", "what is X worth", "price target"

NZ-adapted:
- Risk-free rate: RBNZ OCR (3.75%)
- NZ corporate tax rate: 28%
- NZ equity risk premium: 5.5-6.5%
- Governance risk premium from GRS score
- NZ sector WACC ranges
- Insider sentiment check

## Architecture

Forked from Dexter's agent loop:
- Iterative tool-calling (max 10 iterations)
- Context management with token threshold clearing
- Multi-provider LLM support (Anthropic, OpenAI, Google, xAI, Ollama)
- Streaming responses
- All financial data from NZXplorer API with `?format=llm` for token efficiency

## Data Gaps (Known)

| Feature | Status |
|---------|--------|
| Analyst estimates / price targets | No data — NZ has no public consensus service |
| Revenue segments | Not normalised — exists in raw PDF extractions |
| Real-time prices | Daily close only, not intraday |
| Options / derivatives | Not covered |
| ASX dual-listed detail | NZX data only |

## License

MIT (inherits from Dexter)
