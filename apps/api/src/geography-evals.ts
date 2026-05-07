import {
  countryFromIsin,
  diagnoseGeographyAllocations,
  isFundLikeAsset,
  normalizeGeographyAllocations,
} from "./geography";

export const GEOGRAPHY_EVAL_FIXTURES = [
  {
    name: "AAPL direct equity resolves from US ISIN",
    pass: countryFromIsin("US0378331005")?.code === "US",
  },
  {
    name: "TTE direct equity resolves from FR ISIN",
    pass: countryFromIsin("FR0000120271")?.code === "FR",
  },
  {
    name: "Synthetic Nasdaq ETF should accept underlying US exposure",
    pass:
      normalizeGeographyAllocations([{ country_code: "US", weight_pct: 100 }], {
        confidence: 0.9,
        usesDomicileOrCollateral: false,
      })[0]?.countryCode === "US",
  },
  {
    name: "Synthetic collateral/domicile output is rejected",
    pass:
      normalizeGeographyAllocations([{ country_code: "FR", weight_pct: 100 }], {
        confidence: 0.9,
        usesDomicileOrCollateral: true,
      }).length === 0,
  },
  {
    name: "Weak ETF evidence is rejected",
    pass:
      normalizeGeographyAllocations([{ country_code: "US", weight_pct: 100 }], {
        confidence: 0.4,
      }).length === 0,
  },
  {
    name: "Weights that do not sum near 100 are rejected",
    pass:
      normalizeGeographyAllocations(
        [
          { country_code: "US", weight_pct: 40 },
          { country_code: "JP", weight_pct: 20 },
        ],
        { confidence: 0.9 },
      ).length === 0,
  },
  {
    name: "FR0013412012 Amundi Emerging Asia country weights are accepted",
    pass:
      normalizeGeographyAllocations(
        [
          { country_name: "Taïwan", weight_pct: 32.4 },
          { country_name: "Chine", weight_pct: 28.44 },
          { country_name: "Corée du sud", weight_pct: 23.55 },
          { country_name: "Inde", weight_pct: 11.89 },
          { country_name: "Thaïlande", weight_pct: 1.32 },
          { country_name: "Malaisie", weight_pct: 1.23 },
          { country_name: "Indonésie", weight_pct: 0.81 },
          { country_name: "Philippines", weight_pct: 0.36 },
        ],
        { confidence: 0.9, usesDomicileOrCollateral: false },
      ).length === 8,
  },
  {
    name: "Emerging Asia ETF accepts China/Taiwan/India/Korea/Thailand/Indonesia/Malaysia weights",
    pass:
      normalizeGeographyAllocations(
        [
          { country_code: "CN", weight_pct: 36.2 },
          { country_code: "TW", weight_pct: 22.4 },
          { country_code: "IN", weight_pct: 18.1 },
          { country_code: "KR", weight_pct: 14.8 },
          { country_code: "TH", weight_pct: 3.1 },
          { country_code: "ID", weight_pct: 2.8 },
          { country_code: "MY", weight_pct: 2.6 },
        ],
        { confidence: 0.86, usesDomicileOrCollateral: false },
      ).length === 7,
  },
  {
    name: "Common source label aliases normalize for Emerging Asia countries",
    pass:
      normalizeGeographyAllocations(
        [
          { country_name: "Mainland China", weight_pct: 36.2 },
          { country_name: "Taiwan", weight_pct: 22.4 },
          { country_name: "India", weight_pct: 18.1 },
          { country_name: "Korea, Republic", weight_pct: 14.8 },
          { country_name: "Thailand", weight_pct: 3.1 },
          { country_name: "Indonesia", weight_pct: 2.8 },
          { country_name: "Malaysia", weight_pct: 2.6 },
        ],
        { confidence: 0.86, usesDomicileOrCollateral: false },
      )[3]?.countryCode === "KR",
  },
  {
    name: "Unknown country labels are reported in diagnostics",
    pass: (() => {
      const result = diagnoseGeographyAllocations(
        [
          { country_name: "United States", weight_pct: 90 },
          { country_name: "Atlantis", weight_pct: 10 },
        ],
        { confidence: 0.9 },
      );
      return (
        result.allocations.length === 0 &&
        result.diagnostics.invalidCountryLabels.includes("Atlantis") &&
        result.diagnostics.reason?.includes("Accepted country weights sum") === true
      );
    })(),
  },
  {
    name: "ETF/fund detection includes UCITS labels",
    pass: isFundLikeAsset("ETF", "AMUNDI PEA NASDAQ-100 UCITS ETF", "PANX.PA"),
  },
];

export function runGeographyFixtureEvals(): void {
  const failed = GEOGRAPHY_EVAL_FIXTURES.filter((fixture) => !fixture.pass);
  if (failed.length > 0) {
    throw new Error(`Geography eval failures: ${failed.map((fixture) => fixture.name).join(", ")}`);
  }
}
