export type GeographySource = "isin" | "yahoo_profile" | "llm_web" | "unknown";

export interface GeographyAllocationInput {
  country_code?: unknown;
  country?: unknown;
  country_name?: unknown;
  weight_pct?: unknown;
}

export interface NormalizedGeographyAllocation {
  countryCode: string;
  countryName: string;
  weightPct: number;
}

export interface GeographyNormalizationDiagnostics {
  reason: string | null;
  confidence: number;
  minConfidence: number;
  usesDomicileOrCollateral: boolean;
  acceptedWeightTotal: number;
  rejectedWeightTotal: number;
  invalidCountryLabels: string[];
  invalidWeightLabels: string[];
}

export interface EtfGeographyExtraction {
  allocations?: GeographyAllocationInput[];
  confidence?: unknown;
  as_of_date?: unknown;
  notes?: unknown;
  uses_domicile_or_collateral?: unknown;
  sources?: unknown;
  source_type?: unknown;
}

const COUNTRY_BY_CODE: Record<string, { name: string; numeric: string }> = {
  AD: { name: "Andorra", numeric: "020" },
  AE: { name: "United Arab Emirates", numeric: "784" },
  AF: { name: "Afghanistan", numeric: "004" },
  AG: { name: "Antigua and Barbuda", numeric: "028" },
  AI: { name: "Anguilla", numeric: "660" },
  AL: { name: "Albania", numeric: "008" },
  AM: { name: "Armenia", numeric: "051" },
  AO: { name: "Angola", numeric: "024" },
  AQ: { name: "Antarctica", numeric: "010" },
  AR: { name: "Argentina", numeric: "032" },
  AS: { name: "American Samoa", numeric: "016" },
  AT: { name: "Austria", numeric: "040" },
  AU: { name: "Australia", numeric: "036" },
  AW: { name: "Aruba", numeric: "533" },
  AX: { name: "Aland Islands", numeric: "248" },
  AZ: { name: "Azerbaijan", numeric: "031" },
  BA: { name: "Bosnia and Herzegovina", numeric: "070" },
  BB: { name: "Barbados", numeric: "052" },
  BD: { name: "Bangladesh", numeric: "050" },
  BE: { name: "Belgium", numeric: "056" },
  BF: { name: "Burkina Faso", numeric: "854" },
  BG: { name: "Bulgaria", numeric: "100" },
  BH: { name: "Bahrain", numeric: "048" },
  BI: { name: "Burundi", numeric: "108" },
  BJ: { name: "Benin", numeric: "204" },
  BL: { name: "Saint Barthelemy", numeric: "652" },
  BM: { name: "Bermuda", numeric: "060" },
  BN: { name: "Brunei Darussalam", numeric: "096" },
  BO: { name: "Bolivia", numeric: "068" },
  BQ: { name: "Bonaire, Sint Eustatius and Saba", numeric: "535" },
  BR: { name: "Brazil", numeric: "076" },
  BS: { name: "Bahamas", numeric: "044" },
  BT: { name: "Bhutan", numeric: "064" },
  BV: { name: "Bouvet Island", numeric: "074" },
  BW: { name: "Botswana", numeric: "072" },
  BY: { name: "Belarus", numeric: "112" },
  BZ: { name: "Belize", numeric: "084" },
  CA: { name: "Canada", numeric: "124" },
  CC: { name: "Cocos Islands", numeric: "166" },
  CD: { name: "Congo, Democratic Republic of the", numeric: "180" },
  CF: { name: "Central African Republic", numeric: "140" },
  CG: { name: "Congo", numeric: "178" },
  CH: { name: "Switzerland", numeric: "756" },
  CI: { name: "Cote d'Ivoire", numeric: "384" },
  CK: { name: "Cook Islands", numeric: "184" },
  CL: { name: "Chile", numeric: "152" },
  CM: { name: "Cameroon", numeric: "120" },
  CN: { name: "China", numeric: "156" },
  CO: { name: "Colombia", numeric: "170" },
  CR: { name: "Costa Rica", numeric: "188" },
  CU: { name: "Cuba", numeric: "192" },
  CV: { name: "Cabo Verde", numeric: "132" },
  CW: { name: "Curacao", numeric: "531" },
  CX: { name: "Christmas Island", numeric: "162" },
  CY: { name: "Cyprus", numeric: "196" },
  CZ: { name: "Czechia", numeric: "203" },
  DE: { name: "Germany", numeric: "276" },
  DJ: { name: "Djibouti", numeric: "262" },
  DK: { name: "Denmark", numeric: "208" },
  DM: { name: "Dominica", numeric: "212" },
  DO: { name: "Dominican Republic", numeric: "214" },
  DZ: { name: "Algeria", numeric: "012" },
  EC: { name: "Ecuador", numeric: "218" },
  EE: { name: "Estonia", numeric: "233" },
  EG: { name: "Egypt", numeric: "818" },
  EH: { name: "Western Sahara", numeric: "732" },
  ER: { name: "Eritrea", numeric: "232" },
  ES: { name: "Spain", numeric: "724" },
  ET: { name: "Ethiopia", numeric: "231" },
  FI: { name: "Finland", numeric: "246" },
  FJ: { name: "Fiji", numeric: "242" },
  FK: { name: "Falkland Islands", numeric: "238" },
  FM: { name: "Micronesia", numeric: "583" },
  FO: { name: "Faroe Islands", numeric: "234" },
  FR: { name: "France", numeric: "250" },
  GA: { name: "Gabon", numeric: "266" },
  GB: { name: "United Kingdom", numeric: "826" },
  GD: { name: "Grenada", numeric: "308" },
  GE: { name: "Georgia", numeric: "268" },
  GF: { name: "French Guiana", numeric: "254" },
  GG: { name: "Guernsey", numeric: "831" },
  GH: { name: "Ghana", numeric: "288" },
  GI: { name: "Gibraltar", numeric: "292" },
  GL: { name: "Greenland", numeric: "304" },
  GM: { name: "Gambia", numeric: "270" },
  GN: { name: "Guinea", numeric: "324" },
  GP: { name: "Guadeloupe", numeric: "312" },
  GQ: { name: "Equatorial Guinea", numeric: "226" },
  GR: { name: "Greece", numeric: "300" },
  GS: { name: "South Georgia and the South Sandwich Islands", numeric: "239" },
  GT: { name: "Guatemala", numeric: "320" },
  GU: { name: "Guam", numeric: "316" },
  GW: { name: "Guinea-Bissau", numeric: "624" },
  GY: { name: "Guyana", numeric: "328" },
  HK: { name: "Hong Kong", numeric: "344" },
  HM: { name: "Heard Island and McDonald Islands", numeric: "334" },
  HN: { name: "Honduras", numeric: "340" },
  HR: { name: "Croatia", numeric: "191" },
  HT: { name: "Haiti", numeric: "332" },
  HU: { name: "Hungary", numeric: "348" },
  ID: { name: "Indonesia", numeric: "360" },
  IE: { name: "Ireland", numeric: "372" },
  IL: { name: "Israel", numeric: "376" },
  IM: { name: "Isle of Man", numeric: "833" },
  IN: { name: "India", numeric: "356" },
  IO: { name: "British Indian Ocean Territory", numeric: "086" },
  IQ: { name: "Iraq", numeric: "368" },
  IR: { name: "Iran", numeric: "364" },
  IS: { name: "Iceland", numeric: "352" },
  IT: { name: "Italy", numeric: "380" },
  JE: { name: "Jersey", numeric: "832" },
  JM: { name: "Jamaica", numeric: "388" },
  JO: { name: "Jordan", numeric: "400" },
  JP: { name: "Japan", numeric: "392" },
  KE: { name: "Kenya", numeric: "404" },
  KG: { name: "Kyrgyzstan", numeric: "417" },
  KH: { name: "Cambodia", numeric: "116" },
  KI: { name: "Kiribati", numeric: "296" },
  KM: { name: "Comoros", numeric: "174" },
  KN: { name: "Saint Kitts and Nevis", numeric: "659" },
  KP: { name: "North Korea", numeric: "408" },
  KR: { name: "South Korea", numeric: "410" },
  KW: { name: "Kuwait", numeric: "414" },
  KY: { name: "Cayman Islands", numeric: "136" },
  KZ: { name: "Kazakhstan", numeric: "398" },
  LA: { name: "Lao People's Democratic Republic", numeric: "418" },
  LB: { name: "Lebanon", numeric: "422" },
  LC: { name: "Saint Lucia", numeric: "662" },
  LI: { name: "Liechtenstein", numeric: "438" },
  LK: { name: "Sri Lanka", numeric: "144" },
  LR: { name: "Liberia", numeric: "430" },
  LS: { name: "Lesotho", numeric: "426" },
  LT: { name: "Lithuania", numeric: "440" },
  LU: { name: "Luxembourg", numeric: "442" },
  LV: { name: "Latvia", numeric: "428" },
  LY: { name: "Libya", numeric: "434" },
  MA: { name: "Morocco", numeric: "504" },
  MC: { name: "Monaco", numeric: "492" },
  MD: { name: "Moldova", numeric: "498" },
  ME: { name: "Montenegro", numeric: "499" },
  MF: { name: "Saint Martin", numeric: "663" },
  MG: { name: "Madagascar", numeric: "450" },
  MH: { name: "Marshall Islands", numeric: "584" },
  MK: { name: "North Macedonia", numeric: "807" },
  ML: { name: "Mali", numeric: "466" },
  MM: { name: "Myanmar", numeric: "104" },
  MN: { name: "Mongolia", numeric: "496" },
  MO: { name: "Macao", numeric: "446" },
  MP: { name: "Northern Mariana Islands", numeric: "580" },
  MQ: { name: "Martinique", numeric: "474" },
  MR: { name: "Mauritania", numeric: "478" },
  MS: { name: "Montserrat", numeric: "500" },
  MT: { name: "Malta", numeric: "470" },
  MU: { name: "Mauritius", numeric: "480" },
  MV: { name: "Maldives", numeric: "462" },
  MW: { name: "Malawi", numeric: "454" },
  MX: { name: "Mexico", numeric: "484" },
  MY: { name: "Malaysia", numeric: "458" },
  MZ: { name: "Mozambique", numeric: "508" },
  NA: { name: "Namibia", numeric: "516" },
  NC: { name: "New Caledonia", numeric: "540" },
  NE: { name: "Niger", numeric: "562" },
  NF: { name: "Norfolk Island", numeric: "574" },
  NG: { name: "Nigeria", numeric: "566" },
  NI: { name: "Nicaragua", numeric: "558" },
  NL: { name: "Netherlands", numeric: "528" },
  NO: { name: "Norway", numeric: "578" },
  NP: { name: "Nepal", numeric: "524" },
  NR: { name: "Nauru", numeric: "520" },
  NU: { name: "Niue", numeric: "570" },
  NZ: { name: "New Zealand", numeric: "554" },
  OM: { name: "Oman", numeric: "512" },
  PA: { name: "Panama", numeric: "591" },
  PE: { name: "Peru", numeric: "604" },
  PF: { name: "French Polynesia", numeric: "258" },
  PG: { name: "Papua New Guinea", numeric: "598" },
  PH: { name: "Philippines", numeric: "608" },
  PK: { name: "Pakistan", numeric: "586" },
  PL: { name: "Poland", numeric: "616" },
  PM: { name: "Saint Pierre and Miquelon", numeric: "666" },
  PN: { name: "Pitcairn", numeric: "612" },
  PR: { name: "Puerto Rico", numeric: "630" },
  PS: { name: "Palestine", numeric: "275" },
  PT: { name: "Portugal", numeric: "620" },
  PW: { name: "Palau", numeric: "585" },
  PY: { name: "Paraguay", numeric: "600" },
  QA: { name: "Qatar", numeric: "634" },
  RE: { name: "Reunion", numeric: "638" },
  RO: { name: "Romania", numeric: "642" },
  RS: { name: "Serbia", numeric: "688" },
  RU: { name: "Russia", numeric: "643" },
  RW: { name: "Rwanda", numeric: "646" },
  SA: { name: "Saudi Arabia", numeric: "682" },
  SB: { name: "Solomon Islands", numeric: "090" },
  SC: { name: "Seychelles", numeric: "690" },
  SD: { name: "Sudan", numeric: "729" },
  SE: { name: "Sweden", numeric: "752" },
  SG: { name: "Singapore", numeric: "702" },
  SH: { name: "Saint Helena, Ascension and Tristan da Cunha", numeric: "654" },
  SI: { name: "Slovenia", numeric: "705" },
  SJ: { name: "Svalbard and Jan Mayen", numeric: "744" },
  SK: { name: "Slovakia", numeric: "703" },
  SL: { name: "Sierra Leone", numeric: "694" },
  SM: { name: "San Marino", numeric: "674" },
  SN: { name: "Senegal", numeric: "686" },
  SO: { name: "Somalia", numeric: "706" },
  SR: { name: "Suriname", numeric: "740" },
  SS: { name: "South Sudan", numeric: "728" },
  ST: { name: "Sao Tome and Principe", numeric: "678" },
  SV: { name: "El Salvador", numeric: "222" },
  SX: { name: "Sint Maarten", numeric: "534" },
  SY: { name: "Syrian Arab Republic", numeric: "760" },
  SZ: { name: "Eswatini", numeric: "748" },
  TC: { name: "Turks and Caicos Islands", numeric: "796" },
  TD: { name: "Chad", numeric: "148" },
  TF: { name: "French Southern Territories", numeric: "260" },
  TG: { name: "Togo", numeric: "768" },
  TH: { name: "Thailand", numeric: "764" },
  TJ: { name: "Tajikistan", numeric: "762" },
  TK: { name: "Tokelau", numeric: "772" },
  TL: { name: "Timor-Leste", numeric: "626" },
  TM: { name: "Turkmenistan", numeric: "795" },
  TN: { name: "Tunisia", numeric: "788" },
  TO: { name: "Tonga", numeric: "776" },
  TR: { name: "Turkey", numeric: "792" },
  TT: { name: "Trinidad and Tobago", numeric: "780" },
  TV: { name: "Tuvalu", numeric: "798" },
  TW: { name: "Taiwan", numeric: "158" },
  TZ: { name: "Tanzania", numeric: "834" },
  UA: { name: "Ukraine", numeric: "804" },
  UG: { name: "Uganda", numeric: "800" },
  UM: { name: "United States Minor Outlying Islands", numeric: "581" },
  US: { name: "United States", numeric: "840" },
  UY: { name: "Uruguay", numeric: "858" },
  UZ: { name: "Uzbekistan", numeric: "860" },
  VA: { name: "Holy See", numeric: "336" },
  VC: { name: "Saint Vincent and the Grenadines", numeric: "670" },
  VE: { name: "Venezuela", numeric: "862" },
  VG: { name: "Virgin Islands, British", numeric: "092" },
  VI: { name: "Virgin Islands, U.S.", numeric: "850" },
  VN: { name: "Vietnam", numeric: "704" },
  VU: { name: "Vanuatu", numeric: "548" },
  WF: { name: "Wallis and Futuna", numeric: "876" },
  WS: { name: "Samoa", numeric: "882" },
  YE: { name: "Yemen", numeric: "887" },
  YT: { name: "Mayotte", numeric: "175" },
  ZA: { name: "South Africa", numeric: "710" },
  ZM: { name: "Zambia", numeric: "894" },
  ZW: { name: "Zimbabwe", numeric: "716" },
};

const COUNTRY_ALIASES: Record<string, string> = {
  america: "US",
  "bolivia plurinational state of": "BO",
  "britain": "GB",
  "brunei": "BN",
  "great britain": "GB",
  "china mainland": "CN",
  chine: "CN",
  "coree du sud": "KR",
  "cote divoire": "CI",
  "cote d ivoire": "CI",
  "czech republic": "CZ",
  "democratic republic of congo": "CD",
  "hong kong china": "HK",
  "hong kong sar": "HK",
  "iran islamic republic of": "IR",
  "korea": "KR",
  "korea republic": "KR",
  "korea republic of": "KR",
  inde: "IN",
  indonesie: "ID",
  "lao pdr": "LA",
  malaisie: "MY",
  "mainland china": "CN",
  "macao sar": "MO",
  "moldova republic of": "MD",
  "republic of korea": "KR",
  "russian federation": "RU",
  "south korea": "KR",
  "syria": "SY",
  taiwan: "TW",
  "taiwan province of china": "TW",
  "tanzania united republic of": "TZ",
  thailande: "TH",
  "turkiye": "TR",
  "u k": "GB",
  "uae": "AE",
  "uk": "GB",
  "united kingdom": "GB",
  "united states": "US",
  "united states of america": "US",
  "usa": "US",
  "venezuela bolivarian republic of": "VE",
  "viet nam": "VN",
  "vietnam": "VN",
};

function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeCountryCode(value: unknown): string | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(raw) && COUNTRY_BY_CODE[raw]) return raw;
  const byName = COUNTRY_ALIASES[normalizeName(raw)];
  if (byName) return byName;
  const entry = Object.entries(COUNTRY_BY_CODE).find(
    ([, country]) => normalizeName(country.name) === normalizeName(raw),
  );
  return entry?.[0] ?? null;
}

export function countryNameForCode(code: string): string {
  return COUNTRY_BY_CODE[code]?.name ?? code;
}

export function countryNumericForCode(code: string): string | null {
  return COUNTRY_BY_CODE[code]?.numeric ?? null;
}

export function countryFromIsin(isin: string | null | undefined): {
  code: string;
  name: string;
} | null {
  const code = normalizeCountryCode(isin?.slice(0, 2));
  if (!code) return null;
  return { code, name: countryNameForCode(code) };
}

export function isFundLikeAsset(assetType: string | null | undefined, name = "", ticker = ""): boolean {
  const value = `${assetType ?? ""} ${name} ${ticker}`.toLowerCase();
  return /\betf\b|exchange traded fund|mutual\s*fund|\bfund\b|\bucits\b|\buc\.?etf\b/.test(value);
}

export function normalizeGeographyAllocations(
  rawAllocations: GeographyAllocationInput[] | undefined,
  options: { minConfidence?: number; confidence?: unknown; usesDomicileOrCollateral?: unknown } = {},
): NormalizedGeographyAllocation[] {
  return diagnoseGeographyAllocations(rawAllocations, options).allocations;
}

export function diagnoseGeographyAllocations(
  rawAllocations: GeographyAllocationInput[] | undefined,
  options: { minConfidence?: number; confidence?: unknown; usesDomicileOrCollateral?: unknown } = {},
): {
  allocations: NormalizedGeographyAllocation[];
  diagnostics: GeographyNormalizationDiagnostics;
} {
  const confidence = Number(options.confidence ?? 0);
  const minConfidence = options.minConfidence ?? 0.65;
  const usesDomicileOrCollateral = options.usesDomicileOrCollateral === true;
  const diagnostics: GeographyNormalizationDiagnostics = {
    reason: null,
    confidence,
    minConfidence,
    usesDomicileOrCollateral,
    acceptedWeightTotal: 0,
    rejectedWeightTotal: 0,
    invalidCountryLabels: [],
    invalidWeightLabels: [],
  };

  if (usesDomicileOrCollateral) {
    diagnostics.reason = "Model output appeared to describe domicile, issuer, exchange, or collateral exposure.";
    return { allocations: [], diagnostics };
  }
  if (!Number.isFinite(confidence) || confidence < minConfidence) {
    diagnostics.reason = `Confidence ${Number.isFinite(confidence) ? confidence.toFixed(2) : "0.00"} is below the ${minConfidence.toFixed(2)} threshold.`;
    return { allocations: [], diagnostics };
  }

  const allocations: NormalizedGeographyAllocation[] = [];
  for (const row of rawAllocations ?? []) {
    const label = row.country_code ?? row.country ?? row.country_name;
    const labelText = String(label ?? "").trim() || "(blank)";
    const code = normalizeCountryCode(label);
    const weightPct = Number(row.weight_pct);
    if (!Number.isFinite(weightPct) || weightPct <= 0) {
      diagnostics.invalidWeightLabels.push(labelText);
      continue;
    }
    if (!code) {
      diagnostics.invalidCountryLabels.push(labelText);
      diagnostics.rejectedWeightTotal += weightPct;
      continue;
    }
    diagnostics.acceptedWeightTotal += weightPct;
    allocations.push({
      countryCode: code,
      countryName: countryNameForCode(code),
      weightPct,
    });
  }

  const total = diagnostics.acceptedWeightTotal;
  if (total < 95 || total > 105) {
    const invalidCountries =
      diagnostics.invalidCountryLabels.length > 0
        ? ` Invalid countries: ${diagnostics.invalidCountryLabels.slice(0, 5).join(", ")}.`
        : "";
    diagnostics.reason = `Accepted country weights sum to ${total.toFixed(1)}%, outside the 95-105% guardrail.${invalidCountries}`;
    return { allocations: [], diagnostics };
  }

  return {
    allocations: allocations.map((row) => ({
      ...row,
      weightPct: Math.round((row.weightPct / total) * 10000) / 100,
    })),
    diagnostics,
  };
}

export function buildEtfGeographyResearchPrompt(input: {
  ticker: string;
  name: string;
  isin: string | null;
  assetType?: string | null;
}): string {
  return [
    "Find the underlying country allocation for this ETF/fund.",
    "Use web research. Decide where to look yourself: issuer product page, issuer factsheet/reporting PDF, ETF data pages, index provider, or other credible fund/index sources.",
    "Return the economic/index exposure that drives investor returns.",
    "Do not use fund domicile, issuer country, exchange country, PEA eligibility basket, legal registration, synthetic swap collateral, or substitute basket as country exposure.",
    "If the fund tracks an index, country weights from the issuer, the tracked index provider, factsheet, or ETF data page are valid evidence.",
    "Use the most specific and recent country breakdown you can find for this ISIN/fund/index.",
    "If you truly cannot find country weights, return an empty allocations array and explain exactly what you looked for in notes.",
    "Return strict JSON only with this schema:",
    '{ "allocations": [{ "country_code": "US", "country_name": "United States", "weight_pct": 63.4 }], "confidence": 0.0, "as_of_date": null, "uses_domicile_or_collateral": false, "source_type": "issuer_product_page", "notes": "...", "sources": [{ "title": "...", "url": "...", "source": "..." }] }',
    "Weights must sum to about 100 when allocations are present.",
    "Confidence should be >= 0.65 only when you found actual country weights from a credible fund/index source.",
    "",
    `Ticker: ${input.ticker}`,
    `Name: ${input.name}`,
    `ISIN: ${input.isin ?? "unknown"}`,
    `Asset type: ${input.assetType ?? "unknown"}`,
  ].join("\n");
}

export function normalizeEtfExtraction(raw: EtfGeographyExtraction): {
  allocations: NormalizedGeographyAllocation[];
  confidence: number;
  evidence: Record<string, unknown>;
} {
  const rawConfidence = Number(raw.confidence ?? 0);
  const confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : 0;
  const { allocations, diagnostics } = diagnoseGeographyAllocations(raw.allocations, {
    confidence,
    usesDomicileOrCollateral: raw.uses_domicile_or_collateral,
  });
  return {
    allocations,
    confidence,
    evidence: {
      asOfDate: typeof raw.as_of_date === "string" ? raw.as_of_date : null,
      notes: typeof raw.notes === "string" ? raw.notes : "",
      sources: Array.isArray(raw.sources) ? raw.sources : [],
      sourceType: typeof raw.source_type === "string" ? raw.source_type : null,
      usesDomicileOrCollateral: Boolean(raw.uses_domicile_or_collateral),
      normalizationDiagnostics: diagnostics,
    },
  };
}
