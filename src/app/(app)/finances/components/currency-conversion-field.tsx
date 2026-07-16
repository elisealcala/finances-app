"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, cn } from "@/lib/utils";

type Currency = "PEN" | "USD" | "EUR";

type RateBasis = {
  fromCurrency: Currency;
  toCurrency: Currency;
};

function isPenUsdPair(fromCurrency: Currency, toCurrency: Currency) {
  return (
    (fromCurrency === "PEN" && toCurrency === "USD") ||
    (fromCurrency === "USD" && toCurrency === "PEN")
  );
}

export function getCurrencyConversionRateBasis(
  fromCurrency: Currency,
  toCurrency: Currency,
): RateBasis {
  if (isPenUsdPair(fromCurrency, toCurrency)) {
    return { fromCurrency: "USD", toCurrency: "PEN" };
  }

  return { fromCurrency, toCurrency };
}

export function convertCurrencyAmount(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rate: number,
  rateBasis: RateBasis = { fromCurrency, toCurrency },
) {
  if (fromCurrency === toCurrency) return amount;

  if (
    rateBasis.fromCurrency === fromCurrency &&
    rateBasis.toCurrency === toCurrency
  ) {
    return amount * rate;
  }

  if (
    rateBasis.fromCurrency === toCurrency &&
    rateBasis.toCurrency === fromCurrency
  ) {
    return amount / rate;
  }

  return amount * rate;
}

export function getEffectiveConversionRate(
  displayedRate: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rateBasis: RateBasis = { fromCurrency, toCurrency },
) {
  return convertCurrencyAmount(
    1,
    fromCurrency,
    toCurrency,
    displayedRate,
    rateBasis,
  );
}

export function getDisplayedConversionRate(
  effectiveRate: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rateBasis: RateBasis = { fromCurrency, toCurrency },
) {
  if (
    rateBasis.fromCurrency === fromCurrency &&
    rateBasis.toCurrency === toCurrency
  ) {
    return effectiveRate;
  }

  if (
    rateBasis.fromCurrency === toCurrency &&
    rateBasis.toCurrency === fromCurrency
  ) {
    return 1 / effectiveRate;
  }

  return effectiveRate;
}

type CurrencyConversionFieldProps = {
  /** Source currency the user-entered `amount` is denominated in. */
  fromCurrency: Currency;
  /** Destination currency the amount will be converted to. */
  toCurrency: Currency;
  /** Currency pair the exchange-rate input represents. */
  rateFromCurrency?: Currency;
  rateToCurrency?: Currency;
  /** Amount in `fromCurrency`. */
  amount: number;
  /** Exchange-rate input value (kept as a string so empty/typing states work). */
  rate: string;
  onRateChange: (rate: string) => void;
  /** Optional caption describing the source ("Ahorro Dólares", etc.). */
  label?: React.ReactNode;
  /** Optional sub-line. */
  description?: React.ReactNode;
  /** Render the field-group `<Label>` header. Defaults to true. */
  showHeader?: boolean;
  className?: string;
};

/**
 * Inline currency conversion section. Renders nothing when source and
 * destination currencies match — callers can render it unconditionally.
 *
 * Used in:
 *  - Pay Statement dialog (one instance per paying-account group)
 *  - Transfer form (single instance when from/to accounts differ)
 */
export function CurrencyConversionField({
  fromCurrency,
  toCurrency,
  rateFromCurrency = fromCurrency,
  rateToCurrency = toCurrency,
  amount,
  rate,
  onRateChange,
  label,
  description,
  showHeader = true,
  className,
}: CurrencyConversionFieldProps) {
  if (fromCurrency === toCurrency) return null;

  const parsed = parseFloat(rate);
  const rateBasis = {
    fromCurrency: rateFromCurrency,
    toCurrency: rateToCurrency,
  };
  const converted =
    !isNaN(parsed) && parsed > 0
      ? convertCurrencyAmount(
          amount,
          fromCurrency,
          toCurrency,
          parsed,
          rateBasis,
        )
      : null;

  return (
    <div className={cn("grid gap-2", className)}>
      {showHeader && <Label>Currency Conversion</Label>}
      <div className="bg-muted/50 grid gap-2 rounded-md border p-3">
        {(label || amount > 0) && (
          <div className="text-sm">
            {label && <span className="font-medium">{label}</span>}
            {amount > 0 && (
              <span className="text-muted-foreground">
                {label ? " pays " : "Converting "}
                {formatCurrency(amount, fromCurrency)} to {toCurrency}
              </span>
            )}
          </div>
        )}
        {description && (
          <div className="text-muted-foreground text-xs">{description}</div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            1 {rateFromCurrency} =
          </span>
          <Input
            type="number"
            step="0.0001"
            min="0"
            placeholder="Exchange rate"
            value={rate}
            onChange={(e) => onRateChange(e.target.value)}
            className="h-8"
          />
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {rateToCurrency}
          </span>
        </div>
        {converted !== null && (
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-mono font-semibold tabular-nums">
              {formatCurrency(converted, toCurrency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
