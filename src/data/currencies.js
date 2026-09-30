import allCurrencies from "./allCurrencies.json";
import fallbackRates from "./fallbackRates.json";

// Lista estructurada completa
export const CURRENCY_LIST = allCurrencies;

// Tasas por defecto extraídas del archivo JSON
export const DEFAULT_FALLBACK_RATES = fallbackRates;

// Función para obtener información metadatos de una divisa
export function getCurrencyInfo(code) {
  if (!code) {
    return {
      code: "USD",
      name: "Dólar Estadounidense",
      symbol: "$",
      flag: "🇺🇸",
      type: "fiat",
    };
  }

  const upperCode = code.toUpperCase();
  const known = CURRENCY_LIST.find((c) => c.code === upperCode);

  if (known) return known;

  // Fallback dinámico si la divisa o cripto no está definida manualmente
  const isProbablyCrypto = upperCode.length > 3 || ["BTC", "ETH", "SOL"].includes(upperCode);
  return {
    code: upperCode,
    name: upperCode,
    symbol: upperCode,
    flag: isProbablyCrypto ? "🪙" : "🌐",
    type: isProbablyCrypto ? "crypto" : "fiat",
  };
}

// Función para formatear el valor numérico según sea cripto o fíat
export function formatCurrencyValue(value, type = "fiat") {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return "0.00";

  if (type === "crypto") {
    if (num < 0.000001) return num.toFixed(8);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}