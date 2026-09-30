import allCurrencies from "./allCurrencies.json";
import fallbackRates from "./fallbackRates.json";
import { DOLAR_API_CURRENCIES } from "../services/dolarApi";

// Agregar divisas especializadas de DolarApi que no estén en la lista base
const extraDolarApiCurrencies = DOLAR_API_CURRENCIES.filter(
  (dac) => !allCurrencies.some((c) => c.code === dac.code)
);

// Lista estructurada completa
export const CURRENCY_LIST = [...extraDolarApiCurrencies, ...allCurrencies];

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
  const dolarItem = DOLAR_API_CURRENCIES.find((c) => c.code === upperCode);
  if (dolarItem) return dolarItem;

  const known = CURRENCY_LIST.find((c) => c.code === upperCode);
  if (known) return known;

  // Fallback dinámico si la divisa o cripto no está definida manualmente
  const isLatamSpecial =
    upperCode.startsWith("ARS_") ||
    upperCode.startsWith("VES_") ||
    upperCode.startsWith("BOB_");
  const isProbablyCrypto =
    !isLatamSpecial &&
    (upperCode.length > 3 || ["BTC", "ETH", "SOL"].includes(upperCode));

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
