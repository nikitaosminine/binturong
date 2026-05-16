import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { CURRENCY_OPTIONS, normalizeCurrencyCode } from "@/lib/currency";

interface CurrencySelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  CHF: "Fr",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
};

function CurrencyOptionContent({ code, label }: { code: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-7 shrink-0 text-center text-[11px] font-semibold text-foreground-muted">
        {CURRENCY_SYMBOLS[code] ?? code.slice(0, 1)}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

export function CurrencySelect({ id, value, onValueChange, className }: CurrencySelectProps) {
  const selectedCode = normalizeCurrencyCode(value);
  const selectedCurrency =
    CURRENCY_OPTIONS.find((currency) => currency.code === selectedCode) ?? CURRENCY_OPTIONS[0];

  return (
    <Select value={selectedCode} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={className}>
        <CurrencyOptionContent code={selectedCurrency.code} label={selectedCurrency.label} />
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_OPTIONS.map((currency) => (
          <SelectItem key={currency.code} value={currency.code} textValue={currency.label}>
            <CurrencyOptionContent code={currency.code} label={currency.label} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
