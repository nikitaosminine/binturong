import { useEffect, useMemo, useRef } from "react";

interface Props {
  symbols: string[];
  selectedSymbol?: string;
}

export function TradingViewSymbolOverview({ symbols, selectedSymbol }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const normalizedSymbols = useMemo(
    () => Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))),
    [symbols],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || normalizedSymbols.length === 0) return;

    container.innerHTML = "";
    const widgetHost = document.createElement("div");
    widgetHost.className = "tradingview-widget-container__widget";
    container.appendChild(widgetHost);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;

    const orderedSymbols = selectedSymbol
      ? [selectedSymbol, ...normalizedSymbols.filter((s) => s !== selectedSymbol)]
      : normalizedSymbols;

    script.innerHTML = JSON.stringify({
      symbols: orderedSymbols.map((symbol) => [`${symbol}|1D`]),
      chartOnly: false,
      width: "100%",
      height: "100%",
      locale: "en",
      colorTheme: "dark",
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "Inter, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      lineWidth: 2,
      lineType: 0,
      dateRanges: ["1D|1", "1M|30", "3M|60", "12M|1D", "60M|1W", "ALL|1M"],
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [normalizedSymbols, selectedSymbol]);

  if (normalizedSymbols.length === 0) {
    return <p className="text-xs text-muted-foreground">Add holdings to view market charts.</p>;
  }

  return (
    <div className="tradingview-widget-container h-64" ref={containerRef}>
      <div className="tradingview-widget-container__widget h-full" />
    </div>
  );
}
