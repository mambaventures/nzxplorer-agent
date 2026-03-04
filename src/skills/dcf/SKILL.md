---
name: dcf-valuation
description: Performs discounted cash flow (DCF) valuation analysis for NZX-listed companies to estimate intrinsic value per share. Triggers when user asks for fair value, intrinsic value, DCF, valuation, "what is X worth", price target, undervalued/overvalued analysis, or wants to compare current price to fundamental value.
---

# DCF Valuation Skill (NZX)

## Workflow Checklist

Copy and track progress:
```
DCF Analysis Progress:
- [ ] Step 1: Gather financial data from NZXplorer
- [ ] Step 2: Calculate FCF growth rate
- [ ] Step 3: Estimate discount rate (WACC)
- [ ] Step 4: Project future cash flows (Years 1-5 + Terminal)
- [ ] Step 5: Calculate present value and fair value per share
- [ ] Step 6: Run sensitivity analysis
- [ ] Step 7: Validate results
- [ ] Step 8: Present results with caveats
```

## Step 1: Gather Financial Data

Use the `financial_search` and `financial_metrics` tools to gather data from NZXplorer.

### 1.1 Cash Flow History
**Query:** `"[TICKER] annual cash flow statements for the last 5 years"`

**Extract:** `operating_cash_flow`, `free_cash_flow`, `investing_cash_flow`

**Fallback:** If `free_cash_flow` missing, calculate: `operating_cash_flow - abs(investing_cash_flow)`

### 1.2 Financial Metrics (Snapshot)
**Query:** `"[TICKER] financial metrics snapshot"`

**Extract from get_metrics_detail (mode=snapshot):** `market_cap`, `enterprise_value`, `roe`, `roic`, `debt_to_equity`, `net_margin`, `dividend_yield`, `pe_ratio`, live valuation data, price performance

### 1.3 Balance Sheet
**Query:** `"[TICKER] latest balance sheet"`

**Extract:** `total_assets`, `total_liabilities`, `total_equity`, `net_debt`, `cash_and_equivalents`

**Note:** NZXplorer stores monetary values in NZD thousands. Convert appropriately.

### 1.4 Earnings & Guidance
**Query:** `"[TICKER] earnings results"`

**Extract from get_earnings:** `revenue`, `net_profit`, `guidance_direction`, `revenue_change_pct`, `net_profit_change_pct`

**Use:** Guidance direction (up/down/neutral) helps calibrate growth assumptions.

### 1.5 Current Price & Shares
**Query:** `"[TICKER] metrics snapshot"`

**Extract:** `current_price`, `market_cap` from live_valuation in get_metrics_detail

**Calculate shares:** `market_cap / current_price`

### 1.6 Company & Sector Info
**Query:** `"[TICKER] company detail"`

**Extract from get_company_detail:** `sector`, company description

**Use:** Determine appropriate WACC range from [sector-wacc.md](sector-wacc.md)

### 1.7 Governance Check
**Query:** `"[TICKER] governance score"`

**Extract from get_governance_scores:** `total_score`, `rating`, component scores

**Use:** Poor governance (score < 50) warrants a governance risk premium of 0.5-1.5% added to WACC

### 1.8 Insider Activity
**Query:** `"[TICKER] insider trades last 12 months"`

**Extract from get_insider_trades:** Recent buy/sell patterns

**Use:** Strong insider buying supports bull case assumptions. Heavy selling warrants conservative estimates.

## Step 2: Calculate FCF Growth Rate

Calculate 5-year FCF CAGR from cash flow history.

**Cross-validate with:** earnings guidance direction, revenue growth, net profit growth from earnings results

**Growth rate selection:**
- Stable FCF history → Use CAGR with 10-20% haircut
- Volatile FCF → Weight recent earnings guidance more heavily
- **Cap at 12%** for NZX companies (smaller market, less growth runway than US)
- NZX infrastructure/utilities typically grow at 3-6%
- NZX healthcare/tech may sustain 8-12%

## Step 3: Estimate Discount Rate (WACC)

**NZ-specific assumptions:**
- Risk-free rate: **3.75%** (RBNZ OCR proxy — update if OCR changes)
- NZ equity risk premium: **5.5-6.5%** (higher than US due to smaller market, lower liquidity)
- Cost of debt: 5-7% pre-tax (~3.5-5% after-tax at 28% NZ corporate tax rate)
- NZ corporate tax rate: **28%**

Calculate WACC using `debt_to_equity` from metrics for capital structure weights.

**Governance risk premium:** Add to cost of equity:
- GRS Excellent (80+): 0%
- GRS Very Good (70-79): 0%
- GRS Good (60-69): +0.25%
- GRS Adequate (50-59): +0.5%
- GRS Poor (40-49): +1.0%
- GRS Very Poor (<40): +1.5%

**Use the `sector` from company detail** to select appropriate base WACC from [sector-wacc.md](sector-wacc.md).

**Reasonableness check:** WACC should be 2-4% below ROE/ROIC for value-creating companies.

## Step 4: Project Future Cash Flows

**Years 1-5:** Apply growth rate with 5% annual decay (multiply growth rate by 0.95, 0.90, 0.85, 0.80 for years 2-5).

**Terminal value:** Gordon Growth Model with **2.0% terminal growth** (NZ GDP proxy — lower than US due to smaller economy).

## Step 5: Calculate Present Value

Discount all FCFs → sum for Enterprise Value → subtract Net Debt → divide by shares outstanding for fair value per share.

**Important:** NZXplorer stores financials in NZD thousands. Ensure unit consistency.

## Step 6: Sensitivity Analysis

Create 3×3 matrix: WACC (base ±1%) vs terminal growth (1.5%, 2.0%, 2.5%).

Also show: impact of governance risk premium removal (upside if governance improves).

## Step 7: Validate Results

Before presenting, verify these sanity checks:

1. **Market cap comparison**: Calculated equity value should be within 40% of current market cap
   - NZX stocks can be structurally cheap/expensive vs DCF due to thin liquidity
   - If off by >50%, revisit WACC or growth assumptions

2. **Terminal value ratio**: Terminal value should be 50-80% of total EV for mature companies
   - If >90%, growth rate may be too high
   - If <40%, near-term projections may be aggressive

3. **Dividend cross-check**: Compare implied payout from your FCF projections vs actual dividend yield/payout ratio from NZXplorer data. NZ companies typically pay out 60-80% of earnings.

4. **Insider sentiment check**: If your DCF shows significant undervaluation but insiders are selling, flag the discrepancy.

If validation fails, reconsider assumptions before presenting results.

## Step 8: Output Format

Present a structured summary including:
1. **Valuation Summary**: Current price vs. fair value, upside/downside percentage
2. **Key Inputs Table**: All assumptions with NZ-specific sources (RBNZ OCR, NZ ERP, GRS premium)
3. **Projected FCF Table**: 5-year projections with present values (NZD thousands)
4. **Sensitivity Matrix**: 3×3 grid varying WACC (±1%) and terminal growth (1.5%, 2.0%, 2.5%)
5. **Governance Impact**: How GRS score affects the valuation (with/without governance premium)
6. **Insider Signal**: Recent insider trading activity and what it implies
7. **Caveats**: NZX-specific risks (liquidity, concentrated ownership, NZD exposure, sector concentration)
