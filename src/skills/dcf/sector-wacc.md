# NZX Sector WACC Adjustments

Use these typical WACC ranges as starting points for NZX-listed companies, then adjust based on company-specific factors.

## NZ Market Context

- **Risk-free rate:** 3.75% (RBNZ OCR proxy)
- **NZ equity risk premium:** 5.5-6.5% (higher than US/global due to smaller market, lower liquidity)
- **NZ corporate tax rate:** 28%
- **NZX characteristics:** Concentrated ownership, thin liquidity, high dividend payout culture

## Determining Company Sector

Use `financial_search` with query `"[TICKER] company detail"` to retrieve the company's `sector`. Match to the table below.

## WACC by NZX Sector

| Sector | Typical WACC Range | Key NZX Companies | Notes |
|--------|-------------------|-------------------|-------|
| Energy | 7-9% | MEL, CEN, MCY, GNE | Regulated gentailers, stable cash flows |
| Healthcare | 9-11% | FPH, EBO, RYM, SUM | FPH global growth; aged care more stable |
| Infrastructure | 7-9% | AIA, IFT, CNU | Long-duration assets, regulated returns |
| Transport & Logistics | 8-10% | MFT, ALG, AIR, POT | MFT quality premium; AIR cyclical |
| Financial Services | 8-10% | HGH, NZX | Leverage in business model |
| Consumer | 9-11% | ATM, BGP, KMD, CVT | Cyclical, FX exposure |
| Technology | 9-13% | GTK, SKO, VGL | Higher for early-stage; GTK more mature |
| Property | 7-8% | PCT, KPG, PFI | Interest rate sensitivity, stable yields |
| Industrials | 8-10% | FBU, SKL, SCL | FBU cyclical; SKL more defensive |
| Telecommunications | 7-9% | SPK, CNU | Regulated, stable subscriber base |
| Primary Industries | 9-11% | DGL, SAN, NZK | Commodity/weather exposure |
| Diversified | 8-10% | IFT, POT | Depends on underlying mix |

## NZ-Specific Adjustment Factors

Add to base WACC:
- **High debt (D/E > 1.5)**: +1-2%
- **Small cap (< $500M NZD market cap)**: +1-2% (most NZX companies are "small cap" by global standards)
- **Concentrated customer/supplier risk**: +0.5-1%
- **NZD/commodity FX exposure**: +0.5-1%
- **Poor governance (GRS < 50)**: +0.5-1.5%
- **Thin liquidity (low trading volume)**: +0.5-1%

Subtract from base WACC:
- **Market leader with NZ moat**: -0.5-1% (e.g., AIA monopoly, CNU sole wholesale fibre)
- **Regulated returns**: -0.5-1% (gentailers, infrastructure)
- **Strong governance (GRS > 70)**: -0.25%
- **Consistent dividend history**: -0.25%

## Governance Risk Premium (from NZXplorer GRS)

| GRS Rating | Score Range | WACC Premium |
|------------|-----------|-------------|
| Excellent | 80+ | 0% |
| Very Good | 70-79 | 0% |
| Good | 60-69 | +0.25% |
| Adequate | 50-59 | +0.5% |
| Poor | 40-49 | +1.0% |
| Very Poor | <40 | +1.5% |

## Reasonableness Checks

- WACC should typically be 2-4% below ROIC for value-creating companies
- If calculated WACC > ROIC, the company may be destroying value
- NZX gentailers (MEL, CEN, MCY, GNE) should have WACC 7-9% — if higher, check assumptions
- Compare to sector peers using get_metrics_list with sort='roe'
- NZ dividend payout ratios typically 60-80% — FCF projections should support this
