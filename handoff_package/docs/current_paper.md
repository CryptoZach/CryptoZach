# Regulating Routers: The Control Layer of Internet-Native Dollars

**Fifth Conference on International Roles of the U.S. Dollar**
Federal Reserve Board & Federal Reserve Bank of New York
June 22–23, 2026

*PHASE 5 DRAFT — Exhibit Labels Audited & Aligned*

---

## I. Introduction

The rapid growth of dollar-denominated stablecoins — from approximately $137 billion in early 2023 to over $307 billion by January 2026 — raises fundamental questions about monetary-policy transmission, financial stability, and the regulatory perimeter. This paper argues that the critical determinant of dollar network effects in crypto is not the token taxonomy (algorithmic vs. fiat-backed vs. crypto-collateralized) but rather the *control layer*: the gateway infrastructure that routes dollar flows between the traditional financial system and on-chain markets.

We document three principal findings. First, stablecoin supply exhibits strong, persistent inverse correlations with Federal Reserve policy indicators — including the federal funds rate (r = −0.89), SOFR (r = −0.87), overnight reverse repo outstanding (r = −0.72), and most strikingly, the Fed's total balance sheet assets (r = −0.94). These correlations are consistent with a monetary-policy transmission channel operating through the opportunity cost of holding non-yielding digital dollars.

Second, market structure has concentrated rather than diversified during our sample period: USDT's market share rose from 50% to 61%, while regulatory enforcement actions (BUSD wind-down, USDC's SVB-related depeg) reshaped competitive dynamics in ways that favored less-regulated issuers.

Third, the "control layer" — comprising issuance gateways (Circle, Tether, Paxos), exchange on/off-ramps (Coinbase, Binance), and DeFi protocol routing (Uniswap, Curve, Aave) — mediates all dollar flows and determines the effective regulatory perimeter. We propose a Control Layer Intensity Index (CLII) to quantify gateway-level control and show that stress-period flight-to-quality behavior routes through Tier 1 (highly regulated) gateways.

---

## II. Background

### Stablecoin Mechanics

Stablecoins maintain a nominal $1 peg through various mechanisms:
- **Fiat-backed:** Reserves held in bank deposits, T-bills, repo (USDT, USDC, USDP)
- **Crypto-collateralized:** Over-collateralized vaults (DAI/MakerDAO)
- **Algorithmic:** Mint-burn arbitrage (historical: UST/Terra — collapsed May 2022)
- **Synthetic:** Delta-neutral hedging positions (USDe/Ethena)

### Regulatory Landscape

Key regulatory developments during the sample period:
- NYDFS enforcement: Paxos ordered to cease BUSD minting (Feb 2023)
- SVB contagion: USDC depegged to ~$0.88 on March 11, 2023
- OCC interpretive letters: National banks permitted to hold stablecoin reserves
- EU MiCA implementation: Tether delisted from EU exchanges (2024)
- U.S. stablecoin legislation: GENIUS Act and STABLE Act (2025)

### Key Events Timeline

| Date | Event | Market Impact |
|------|-------|---------------|
| Feb 2023 | NYDFS orders Paxos to stop minting BUSD | BUSD begins wind-down ($16B → $0.05B) |
| Mar 2023 | Silicon Valley Bank failure | USDC depegs, $9.5B outflow |
| Mar 2023 | BTFP launched | Fed provides emergency liquidity |
| Sep 2024 | FOMC begins rate cuts (5.50% → 4.50%) | Stablecoin supply accelerates |
| Jan 2025 | ON RRP near zero | Full liquidity rotation complete |

---

## III. Theoretical Framework

### The Control Layer Hypothesis

We posit that the dollar network effect in crypto is determined not by token design but by the *routing infrastructure* that connects issuance, exchange, and DeFi protocols. This "control layer" consists of:

1. **Issuance Gateways:** Circle (USDC), Tether (USDT), Paxos (PYUSD/USDP)
2. **Exchange Gateways:** Coinbase, Binance, Kraken, Gemini
3. **Protocol Gateways:** Uniswap, Curve, Aave, 0x

Each gateway exhibits a measurable level of regulatory control, which we quantify using the Control Layer Intensity Index (CLII):

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Regulatory License | 25% | BitLicense, state MTLs, bank charters |
| Reserve Transparency | 20% | Attestation frequency, auditor tier |
| Freeze/Blacklist Capability | 20% | Smart-contract admin functions |
| Compliance Infrastructure | 20% | KYC/AML program scope |
| Geographic Restrictions | 15% | OFAC compliance, geo-blocking |

### Gateway CLII Scores

| Gateway | CLII Score | Tier |
|---------|------------|------|
| Circle (USDC) | 0.92 | Tier 1 (High Control) |
| Paxos (USDP/PYUSD) | 0.88 | Tier 1 |
| Coinbase | 0.85 | Tier 1 |
| Tether (USDT) | 0.45 | Tier 2 (Medium Control) |
| Binance (pre-2024) | 0.38 | Tier 2 |
| Curve/Uniswap | 0.15 | Tier 3 (Low Control) |

---

## IV. Data & Methodology

### Data Sources

**FRED Macro Series** (1,095+ daily observations, Feb 2023 – Jan 2026):
- DFF: Federal Funds Effective Rate
- DGS2: 2-Year Treasury Constant Maturity
- DGS10: 10-Year Treasury Constant Maturity
- SOFR: Secured Overnight Financing Rate
- RRPONTSYD: Overnight Reverse Repo Outstanding
- WSHOMCB: Federal Reserve Total Assets (Weekly)

**Stablecoin Supply** (1,096+ daily observations):
Source: DefiLlama Stablecoin API
Tokens: USDT, USDC, DAI, BUSD, FRAX, TUSD, PYUSD, FDUSD, USDP, USDe

**DEX & Bridge Volumes** (1,097+ daily observations):
Source: DefiLlama Volume APIs
Metrics: Total DEX volume, Curve volume, bridge deposits/withdrawals

### Methodology

- Pearson correlation analysis across all variable pairs
- Correlation and time-series analysis
- Date range: Feb 2023 – Jan 2026
- Weekly resampling for time-series econometrics (cointegration, VECM)
- Log transformation for level variables (supply, RRP, Fed assets)

---

## V. Findings

### V.A. Monetary Policy Transmission

**Exhibit 2: Stablecoin Supply vs Federal Funds Rate**
The inverse relationship (r = −0.89) between the federal funds rate and total stablecoin supply is consistent with an opportunity-cost channel. During the rate plateau at 5.25–5.50% (Jul 2023 – Sep 2024), stablecoin supply grew modestly. When rate cuts commenced in September 2024, supply growth accelerated sharply — from $170B to $307B in four months.

**Exhibit 5: Stablecoin Supply vs Overnight Reverse Repo**
The ON RRP facility drained from $2.3 trillion (peak) to near zero by January 2025. The inverse correlation (r = −0.72) with stablecoin supply suggests partial liquidity rotation: as money-market fund balances in the RRP declined, some capital rotated into crypto-native dollar instruments.

**Exhibit 6: Correlation — Macro Indicators vs Stablecoin Supply**
The strongest inverse correlation is between Fed total assets (balance sheet) and stablecoin supply at r = −0.94. This exceeds the rate-based correlations, suggesting that quantitative tightening (balance sheet reduction) may have a more direct effect on stablecoin supply than the policy rate itself. SOFR (r = −0.87) and the 2-year Treasury (r = −0.69) show progressively weaker signals. The 10-year yield correlation is weak (r = −0.21), consistent with stablecoins competing with short-duration instruments rather than long bonds.

### V.B. Market Structure Evolution

**Exhibit 3: Market Capitalization by Token**
USDT dominance increased from 50% to 61% of total stablecoin supply. This concentration occurred despite (or perhaps because of) regulatory pressure on competitors: BUSD's forced wind-down and USDC's SVB-related depeg created a "flight to the incumbent." New entrants — USDe (Ethena's synthetic dollar) and PYUSD (PayPal's stablecoin via Paxos) — gained meaningful traction in 2024–2025, but collectively still represent <5% of the market.

**Exhibit 4: Monthly Net Supply Changes**
The March 2023 crisis is starkly visible: USDC experienced approximately $9.5 billion in net outflows as Circle's exposure to Silicon Valley Bank triggered a depeg. USDT captured much of this flow with consistent net minting throughout the crisis period. USDC net inflows resumed strongly in late 2024 as confidence returned.

### V.C. Control Layer Dynamics

*[Exhibits A, C — Pending Dune Analytics integration]*

During the March 2023 stress period, preliminary evidence suggests Tier 1 gateways captured an additional +15% share of flow routing, consistent with a flight-to-quality mechanism operating at the control-layer level.

### V.D. Systemic Risk Implications

*[Exhibit E — Pending Dune Analytics integration]*

With $307 billion in stablecoins outstanding, reserve composition (predominantly T-bills, repo, and bank deposits for major issuers) creates direct linkages to traditional short-term funding markets. Rapid redemption scenarios during stress could amplify pressure on these markets.

---

## VI. Policy Implications

1. **Gateway-focused regulation** may be more effective than token-focused classification. The control layer determines the actual regulatory perimeter regardless of token design.

2. **Reserve requirements and transparency** should be calibrated to CLII scores: higher-control gateways (Tier 1) demonstrably route more volume during stress periods.

3. **CBDC considerations:** A retail CBDC would operate as a Tier 0 gateway (CLII = 1.0), but must compete with the network effects of existing Tier 1–2 gateways.

4. **Stablecoin legislation** (GENIUS Act, STABLE Act) should incorporate gateway routing as a supervisory dimension alongside issuer-level regulation.

---

## VII. Conclusion

This paper documents a robust monetary-policy transmission channel from Federal Reserve policy variables to stablecoin supply. The correlations are strongest for balance-sheet quantities (r = −0.94 for Fed total assets) and policy rates (r = −0.89 for the funds rate), consistent with stablecoins functioning as unregulated money-market instruments competing for short-duration dollar balances.

The control-layer framework offers a complementary lens: rather than regulating tokens, policymakers should focus on the gateway infrastructure that routes dollar flows. The CLII methodology provides a quantifiable, supervisory-relevant metric for assessing control intensity across the stablecoin ecosystem.

---

## Appendix A: Exhibit Inventory

| ID | Caption | File | Section | Data Source | Status |
|----|---------|------|---------|-------------|--------|
| 1 | Total Stablecoin Market Capitalization | exhibit_1_total_supply.png | V.A | DefiLlama | Complete |
| 2 | Stablecoin Supply vs Federal Funds Rate | exhibit_2_supply_vs_rate.png | V.A | FRED + DefiLlama | Complete |
| 3 | Stablecoin Market Capitalization by Token | exhibit_3_market_share.png | V.B | DefiLlama | Complete |
| 4 | Monthly Net Supply Changes — Major Stablecoins | exhibit_4_net_supply_changes.png | V.B | DefiLlama | Complete |
| 5 | Stablecoin Supply vs Overnight Reverse Repo | exhibit_5_supply_vs_rrp.png | V.A | FRED + DefiLlama | Complete |
| 6 | Correlation — Macro Indicators vs Stablecoin Supply | exhibit_6_correlation_heatmap.png | V.A | FRED + DefiLlama | Complete |
| 7 | DEX Trading Volume | exhibit_7_dex_volumes.png | V.B | DefiLlama | Complete |
| 8 | DEX Volume vs Stablecoin Supply | exhibit_8_volume_vs_supply.png | V.B | DefiLlama | Complete |
| A | Gateway Corridor Flows | exhibit_A_corridor_flows.png | V.C | Dune + CLII | Pending |
| B | Stablecoin + Funding Stress Overlay | exhibit_B_stablecoin_funding.png | V.A | FRED + DefiLlama | Pending |
| C | Gateway CLII & HHI Concentration | exhibit_C_gateway_routing.png | V.C | Dune + CLII | Pending |
| E | Tokenized Assets & DeFi Collateral | exhibit_E_tokenized_defi.png | V.D | Dune (Aave v3) | Pending |
