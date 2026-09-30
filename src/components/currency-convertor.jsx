// src/components/currency-convertor.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import CurrencyDropdown from "./dropdown";
import DolarApiPanel from "./DolarApiPanel";
import { fetchDolarApiData, formatQuoteDate } from "../services/dolarApi";
import {
  ArrowRightLeft,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Sparkles,
  Zap,
  Clock,
  History,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import {
  CURRENCY_LIST,
  DEFAULT_FALLBACK_RATES,
  getCurrencyInfo,
  formatCurrencyValue,
} from "../data/currencies";

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("VES_PARALELO");
  const [rates, setRates] = useState(DEFAULT_FALLBACK_RATES);
  const [ratesDates, setRatesDates] = useState({});
  const [dolarApiDetails, setDolarApiDetails] = useState(null);
  const [allAvailableCodes, setAllAvailableCodes] = useState(
    CURRENCY_LIST.map((c) => c.code)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [swapRotating, setSwapRotating] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Favoritos guardados en localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("convertidor_favorites");
      return saved
        ? JSON.parse(saved)
        : [
            "USD",
            "EUR",
            "VES_PARALELO",
            "VES_OFICIAL",
            "ARS_BLUE",
            "BTC",
            "ETH",
            "SOL",
            "COP",
            "MXN",
          ];
    } catch {
      return [
        "USD",
        "EUR",
        "VES_PARALELO",
        "VES_OFICIAL",
        "ARS_BLUE",
        "BTC",
        "ETH",
        "SOL",
        "COP",
        "MXN",
      ];
    }
  });

  // Historial reciente guardado en localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("convertidor_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Carga de datos de múltiples APIs (DolarApi en vivo + Binance + Coinbase + OpenER)
  const fetchAllRates = useCallback(async () => {
    try {
      const [cbRes, erRes, binanceRes, dolarRes] = await Promise.allSettled([
        fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD", {
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`https://open.er-api.com/v6/latest/USD?_t=${Date.now()}`, {
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch("https://api.binance.com/api/v3/ticker/price", {
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetchDolarApiData(),
      ]);

      const cb = cbRes.status === "fulfilled" ? cbRes.value : null;
      const er = erRes.status === "fulfilled" ? erRes.value : null;
      const binance = binanceRes.status === "fulfilled" ? binanceRes.value : null;
      const dolar = dolarRes.status === "fulfilled" ? dolarRes.value : null;

      setRates((prevRates) => {
        const newRates = { ...DEFAULT_FALLBACK_RATES, ...prevRates };

        // 1. Tasas Fíat Globales (Open ER API)
        if (er?.rates) {
          for (const [code, val] of Object.entries(er.rates)) {
            const num = typeof val === "number" ? val : parseFloat(val);
            if (!isNaN(num) && num > 0) newRates[code] = num;
          }
        }

        // 2. Criptos Coinbase
        if (cb?.data?.rates) {
          for (const [code, valStr] of Object.entries(cb.data.rates)) {
            const num = parseFloat(valStr);
            if (!isNaN(num) && num > 0) newRates[code] = num;
          }
        }

        // 3. Criptos Binance en tiempo real (Tickers USDT)
        if (Array.isArray(binance)) {
          binance.forEach((item) => {
            if (item.symbol && item.symbol.endsWith("USDT")) {
              const sym = item.symbol.replace("USDT", "").toUpperCase();
              const price = parseFloat(item.price);
              if (!isNaN(price) && price > 0) {
                newRates[sym] = 1 / price;
              }
            }
          });
        }

        // 4. DOLARAPI: Máxima prioridad para monedas de América Latina
        // Sobrescribe y garantiza tasas en vivo intradiarias para VES, ARS, COP, CLP, etc.
        if (dolar?.rates) {
          Object.entries(dolar.rates).forEach(([code, val]) => {
            const num = typeof val === "number" ? val : parseFloat(val);
            if (!isNaN(num) && num > 0) {
              newRates[code] = num;
            }
          });
        }

        // Asegurar que todas las variantes de VES existan y tengan valor positivo
        if (!newRates["VES_PARALELO"] || newRates["VES_PARALELO"] <= 0) {
          newRates["VES_PARALELO"] = newRates["VES"] || 955.86;
        }
        if (!newRates["VES_OFICIAL"] || newRates["VES_OFICIAL"] <= 0) {
          newRates["VES_OFICIAL"] = 859.06;
        }
        if (!newRates["VES"] || newRates["VES"] <= 0) {
          newRates["VES"] = newRates["VES_PARALELO"];
        }

        // Asegurar variantes de ARS
        if (!newRates["ARS_BLUE"] || newRates["ARS_BLUE"] <= 0) {
          newRates["ARS_BLUE"] = newRates["ARS"] || 1560.0;
        }
        if (!newRates["ARS_OFICIAL"] || newRates["ARS_OFICIAL"] <= 0) {
          newRates["ARS_OFICIAL"] = 1541.54;
        }
        if (!newRates["ARS"] || newRates["ARS"] <= 0) {
          newRates["ARS"] = newRates["ARS_BLUE"];
        }

        newRates["USD"] = 1.0;

        const curatedCodes = CURRENCY_LIST.map((c) => c.code);
        const dynamicCodes = Object.keys(newRates);
        setAllAvailableCodes(
          Array.from(new Set([...curatedCodes, ...dynamicCodes]))
        );

        return newRates;
      });

      if (dolar?.details) {
        setDolarApiDetails(dolar.details);
      }
      if (dolar?.ratesDates) {
        setRatesDates((prev) => ({ ...prev, ...dolar.ratesDates }));
      }
      setSecondsAgo(0);
    } catch (e) {
      console.warn("Falló la actualización de tasas:", e);
    }
  }, []);

  // Botón manual de actualización
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllRates();
    setIsRefreshing(false);
  };

  // Carga inicial y auto-actualización periódica cada 30 segundos
  useEffect(() => {
    fetchAllRates();
    const interval = setInterval(fetchAllRates, 30000);

    // Re-actualizar inmediatamente al volver a la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchAllRates();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchAllRates]);

  // Contador de segundos transcurridos
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Gestionar favoritos
  const handleFavorite = (currencyCode) => {
    let updated;
    if (favorites.includes(currencyCode)) {
      updated = favorites.filter((fav) => fav !== currencyCode);
    } else {
      updated = [...favorites, currencyCode];
    }
    setFavorites(updated);
    try {
      localStorage.setItem("convertidor_favorites", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Intercambiar divisas con animación
  const swapCurrencies = () => {
    setSwapRotating(true);
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setTimeout(() => setSwapRotating(false), 350);
  };

  // Cálculos en tiempo real
  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amount]);

  const fromInfo = useMemo(
    () => getCurrencyInfo(fromCurrency),
    [fromCurrency]
  );
  const toInfo = useMemo(
    () => getCurrencyInfo(toCurrency),
    [toCurrency]
  );

  // Tasa de conversión robusta con doble capa de respaldo contra valores 0 o undefined
  const conversionRate = useMemo(() => {
    if (fromCurrency === toCurrency) return 1;

    let fromRate =
      typeof rates[fromCurrency] === "number"
        ? rates[fromCurrency]
        : parseFloat(rates[fromCurrency]);
    let toRate =
      typeof rates[toCurrency] === "number"
        ? rates[toCurrency]
        : parseFloat(rates[toCurrency]);

    // Si por alguna razón la tasa en rates es inválida o 0, usar fallback garantizado
    if (!fromRate || isNaN(fromRate) || fromRate <= 0) {
      fromRate = parseFloat(DEFAULT_FALLBACK_RATES[fromCurrency]) || 1;
    }
    if (!toRate || isNaN(toRate) || toRate <= 0) {
      toRate = parseFloat(DEFAULT_FALLBACK_RATES[toCurrency]) || 0;
    }

    if (fromRate <= 0 || toRate <= 0) return 0;
    return toRate / fromRate;
  }, [fromCurrency, toCurrency, rates]);

  const convertedValue = useMemo(() => {
    return numericAmount * conversionRate;
  }, [numericAmount, conversionRate]);

  const inverseRate = useMemo(() => {
    return conversionRate > 0 ? 1 / conversionRate : 0;
  }, [conversionRate]);

  // Formato de salida
  const formattedConvertedValue = useMemo(() => {
    return formatCurrencyValue(convertedValue, toInfo.type);
  }, [convertedValue, toInfo.type]);

  const formattedUnitRate = useMemo(() => {
    return formatCurrencyValue(conversionRate, toInfo.type);
  }, [conversionRate, toInfo.type]);

  const formattedInverseRate = useMemo(() => {
    return formatCurrencyValue(inverseRate, fromInfo.type);
  }, [inverseRate, fromInfo.type]);

  // Guardar en el historial tras cambios
  useEffect(() => {
    if (numericAmount > 0 && convertedValue > 0) {
      const timer = setTimeout(() => {
        setHistory((prev) => {
          const item = {
            id: Date.now(),
            amount: numericAmount,
            from: fromCurrency,
            to: toCurrency,
            result: formattedConvertedValue,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          const filtered = prev.filter(
            (h) =>
              !(
                h.from === fromCurrency &&
                h.to === toCurrency &&
                h.amount === numericAmount
              )
          );
          const updated = [item, ...filtered].slice(0, 4);
          try {
            localStorage.setItem(
              "convertidor_history",
              JSON.stringify(updated)
            );
          } catch (e) {
            console.error(e);
          }
          return updated;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    numericAmount,
    fromCurrency,
    toCurrency,
    convertedValue,
    formattedConvertedValue,
  ]);

  // Copiar resultado al portapapeles
  const handleCopy = () => {
    const text = `${numericAmount} ${fromCurrency} = ${formattedConvertedValue} ${toCurrency}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePresetAmount = (val) => {
    setAmount(val.toString());
  };

  const selectQuickPair = (from, to) => {
    setFromCurrency(from);
    setToCurrency(to);
  };

  // Detección de variantes activas para atajos rápidos
  const isVesActive =
    fromCurrency.startsWith("VES") || toCurrency.startsWith("VES");
  const isArsActive =
    fromCurrency.startsWith("ARS") || toCurrency.startsWith("ARS");

  // Fecha de actualización de la moneda de destino o de origen si proviene de DolarApi
  const activeRateDate =
    ratesDates[toCurrency] || ratesDates[fromCurrency] || null;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header superior */}
      <div className="relative mb-6 p-6 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-2xl overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="w-1.5 h-1.5 -ml-2.5 rounded-full bg-emerald-400" />
                Mercado Global en Vivo
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                DolarApi.com Conectado
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <Globe2 className="w-3 h-3 text-purple-400" />
                Fíat & Cripto
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Convertidor Universal Pro
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Conversiones oficiales y paralelas en tiempo real con DolarApi y mercado cripto en vivo
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition-all hover:border-indigo-500/50 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Actualizar tasas ahora"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-indigo-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>{isRefreshing ? "Actualizando..." : "Actualizar"}</span>
            </button>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>
                {secondsAgo < 5
                  ? "Hace un instante"
                  : `Hace ${secondsAgo}s`}
              </span>
            </div>
          </div>
        </div>

        {/* Filtros rápidos de modo */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1 mr-1 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Modos:
          </span>
          <button
            type="button"
            onClick={() => {
              setFromCurrency("USD");
              setToCurrency("VES_PARALELO");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              fromCurrency === "USD" && toCurrency.startsWith("VES")
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            🇻🇪 USD ➔ VES (DolarApi)
          </button>
          <button
            type="button"
            onClick={() => {
              setFromCurrency("USD");
              setToCurrency("ARS_BLUE");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              fromCurrency === "USD" && toCurrency.startsWith("ARS")
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            🇦🇷 USD ➔ ARS (Blue)
          </button>
          <button
            type="button"
            onClick={() => {
              setFromCurrency("USD");
              setToCurrency("BTC");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              fromInfo.type === "fiat" && toInfo.type === "crypto"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            💵 Fíat ➔ 🪙 Cripto
          </button>
          <button
            type="button"
            onClick={() => {
              setFromCurrency("BTC");
              setToCurrency("USD");
            }}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
              fromInfo.type === "crypto" && toInfo.type === "fiat"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            🪙 Cripto ➔ 💵 Fíat
          </button>
        </div>
      </div>

      {/* Formulario principal */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-2xl">
        {/* Input de monto */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="amount-input"
              className="text-xs font-semibold tracking-wider uppercase text-slate-400"
            >
              Monto a Convertir
            </label>
            <span className="text-xs text-slate-400">
              Moneda:{" "}
              <strong className="text-indigo-400">{fromCurrency}</strong>
            </span>
          </div>

          <div className="relative flex items-center">
            <div className="absolute left-4 font-bold text-slate-400 text-lg pointer-events-none">
              {fromInfo.symbol}
            </div>
            <input
              id="amount-input"
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-800/90 text-white text-2xl sm:text-3xl font-bold pl-11 pr-24 py-3.5 rounded-2xl border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 shadow-inner tracking-wide"
            />
            <div className="absolute right-3.5 flex items-center gap-1.5">
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-700 text-slate-200">
                {fromCurrency}
              </span>
            </div>
          </div>

          {/* Botones de montos rápidos */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 text-[11px] mr-1 shrink-0">
              Rápido:
            </span>
            {fromInfo.type === "crypto" ? (
              <>
                {["0.01", "0.1", "0.5", "1", "5"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handlePresetAmount(val)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-slate-300 font-medium transition-colors hover:text-white cursor-pointer"
                  >
                    {val} {fromCurrency}
                  </button>
                ))}
              </>
            ) : (
              <>
                {["10", "50", "100", "500", "1000", "5000"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handlePresetAmount(val)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-lg text-slate-300 font-medium transition-colors hover:text-white cursor-pointer"
                  >
                    +{val}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Selectores de moneda con botón de Swap */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 sm:gap-4 items-center mb-4">
          <CurrencyDropdown
            title="Convertir De"
            currency={fromCurrency}
            setCurrency={setFromCurrency}
            currencies={allAvailableCodes}
            favorites={favorites}
            handleFavorite={handleFavorite}
          />

          <div className="flex justify-center -my-1 sm:my-0 sm:pt-6">
            <button
              type="button"
              onClick={swapCurrencies}
              title="Intercambiar divisas"
              className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-300 cursor-pointer active:scale-90 group"
            >
              <ArrowRightLeft
                className={`w-5 h-5 transition-transform duration-300 ${
                  swapRotating ? "rotate-180" : "group-hover:rotate-180"
                }`}
              />
            </button>
          </div>

          <CurrencyDropdown
            title="Convertir A"
            currency={toCurrency}
            setCurrency={setToCurrency}
            currencies={allAvailableCodes}
            favorites={favorites}
            handleFavorite={handleFavorite}
          />
        </div>

        {/* Atajos Rápidos de Variantes para VES y ARS */}
        {(isVesActive || isArsActive) && (
          <div className="mb-6 p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">
                {isVesActive
                  ? "🇻🇪 Variantes de Bolívar (Venezuela):"
                  : "🇦🇷 Tipos de Dólar (Argentina):"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                DolarApi en vivo
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {isVesActive && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (toCurrency.startsWith("VES")) setToCurrency("VES_PARALELO");
                      else if (fromCurrency.startsWith("VES")) setFromCurrency("VES_PARALELO");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      toCurrency === "VES_PARALELO" || fromCurrency === "VES_PARALELO"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400"
                        : "bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/60"
                    }`}
                  >
                    🔥 Paralelo ({rates["VES_PARALELO"] ? `${formatCurrencyValue(rates["VES_PARALELO"], "fiat")} Bs` : "955.86 Bs"})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (toCurrency.startsWith("VES")) setToCurrency("VES_OFICIAL");
                      else if (fromCurrency.startsWith("VES")) setFromCurrency("VES_OFICIAL");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      toCurrency === "VES_OFICIAL" || fromCurrency === "VES_OFICIAL"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400"
                        : "bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/60"
                    }`}
                  >
                    🏛️ Oficial BCV ({rates["VES_OFICIAL"] ? `${formatCurrencyValue(rates["VES_OFICIAL"], "fiat")} Bs` : "859.06 Bs"})
                  </button>
                </>
              )}

              {isArsActive && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (toCurrency.startsWith("ARS")) setToCurrency("ARS_BLUE");
                      else if (fromCurrency.startsWith("ARS")) setFromCurrency("ARS_BLUE");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      toCurrency === "ARS_BLUE" || fromCurrency === "ARS_BLUE"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400"
                        : "bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/60"
                    }`}
                  >
                    💵 Blue ({rates["ARS_BLUE"] ? `$${formatCurrencyValue(rates["ARS_BLUE"], "fiat")}` : "$1,560"})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (toCurrency.startsWith("ARS")) setToCurrency("ARS_OFICIAL");
                      else if (fromCurrency.startsWith("ARS")) setFromCurrency("ARS_OFICIAL");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      toCurrency === "ARS_OFICIAL" || fromCurrency === "ARS_OFICIAL"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400"
                        : "bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/60"
                    }`}
                  >
                    🏛️ Oficial ({rates["ARS_OFICIAL"] ? `$${formatCurrencyValue(rates["ARS_OFICIAL"], "fiat")}` : "$1,541"})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (toCurrency.startsWith("ARS")) setToCurrency("ARS_MEP");
                      else if (fromCurrency.startsWith("ARS")) setFromCurrency("ARS_MEP");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      toCurrency === "ARS_MEP" || fromCurrency === "ARS_MEP"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400"
                        : "bg-slate-700/70 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/60"
                    }`}
                  >
                    📈 MEP
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tarjeta de resultado */}
        <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-purple-950/60 border border-indigo-500/30 shadow-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-semibold tracking-wider uppercase text-indigo-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Resultado en Tiempo Real
                </span>
                {activeRateDate && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                    {formatQuoteDate(activeRateDate)}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight break-all">
                  {formattedConvertedValue}
                </span>
                <span className="text-lg sm:text-xl font-bold text-indigo-400">
                  {toCurrency}
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                {numericAmount} {fromInfo.name} ({fromCurrency}) equivalen a{" "}
                <strong className="text-slate-200">
                  {formattedConvertedValue} {toInfo.name} ({toCurrency})
                </strong>
              </p>
            </div>

            <div className="flex sm:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-xl text-xs font-medium text-white transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">
                      ¡Copiado!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-indigo-300" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pie con tasas unitarias */}
          <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-500">Tasa:</span>
              <span className="text-slate-200">
                1 {fromCurrency} = {formattedUnitRate} {toCurrency}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
              <span>
                1 {toCurrency} = {formattedInverseRate} {fromCurrency}
              </span>
            </div>
          </div>
        </div>

        {/* Pares populares */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Pares Populares (1-Click)
            </h3>
            <span className="text-[11px] text-slate-500">Tiempo Real</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { from: "USD", to: "VES_PARALELO", label: "USD / VES Paralelo" },
              { from: "USD", to: "VES_OFICIAL", label: "USD / VES BCV" },
              { from: "USD", to: "ARS_BLUE", label: "USD / ARS Blue" },
              { from: "USD", to: "COP", label: "USD / COP" },
              { from: "BTC", to: "USD", label: "BTC / USD" },
              { from: "ETH", to: "USD", label: "ETH / USD" },
              { from: "SOL", to: "USD", label: "SOL / USD" },
              { from: "USD", to: "EUR", label: "USD / EUR" },
            ].map((pair) => {
              const pairRate =
                rates[pair.from] && rates[pair.to]
                  ? rates[pair.to] / rates[pair.from]
                  : 0;
              const isSelected =
                fromCurrency === pair.from && toCurrency === pair.to;

              return (
                <button
                  key={`${pair.from}-${pair.to}`}
                  type="button"
                  onClick={() => selectQuickPair(pair.from, pair.to)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-950/60 border-indigo-500/50 shadow-md shadow-indigo-500/10"
                      : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {pair.label}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-semibold">
                      Tasa
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono mt-0.5 truncate">
                    {formatCurrencyValue(
                      pairRate,
                      getCurrencyInfo(pair.to).type
                    )}{" "}
                    {pair.to}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Historial */}
        {history.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                Historial Reciente
              </span>
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  localStorage.removeItem("convertidor_history");
                }}
                className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Borrar
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
              {history.map((h) => (
                <div
                  key={h.id}
                  onClick={() => {
                    setAmount(h.amount.toString());
                    setFromCurrency(h.from);
                    setToCurrency(h.to);
                  }}
                  className="shrink-0 p-2 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 rounded-xl cursor-pointer transition-all text-slate-300 hover:text-white"
                  title="Restaurar esta conversión"
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>
                      {h.amount} {h.from}
                    </span>
                    <span className="text-indigo-400">➔</span>
                    <span className="font-bold text-white">
                      {h.result} {h.to}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {h.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panel Informativo de Cotizaciones en Vivo de DolarApi */}
      <DolarApiPanel
        dolarApiDetails={dolarApiDetails}
        onSelectCurrencyPair={selectQuickPair}
        isRefreshing={isRefreshing}
        activeCurrency={toCurrency}
      />
    </div>
  );
}