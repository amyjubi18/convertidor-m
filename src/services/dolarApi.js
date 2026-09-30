// src/services/dolarApi.js

/**
 * Servicio para consumir la API de https://dolarapi.com/
 * Proporciona cotizaciones en tiempo real para monedas fíat de América Latina:
 * - Argentina (Oficial, Blue, Bolsa/MEP, CCL, Tarjeta, Cripto, Mayorista + otras monedas)
 * - Venezuela (Oficial BCV, Paralelo)
 * - Colombia (Dólar, Euro, Real, etc.)
 * - Chile (Dólar, Euro, etc.)
 * - Uruguay (Dólar, Euro, etc.)
 * - México (Dólar FIX / Interbancario)
 * - Bolivia (Oficial, Binance P2P)
 * - Brasil (Dólar comercial, Euro, etc.)
 */

const TIMEOUT_MS = 8000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Evitar que el navegador o CDN sirva cotizaciones viejas (ayer)
    // Agregamos timestamp dinámico y cabeceras estrictas de no-store
    const separator = url.includes("?") ? "&" : "?";
    const cacheBusterUrl = `${url}${separator}_t=${Date.now()}`;
    const res = await fetch(cacheBusterUrl, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function fetchDolarApiData() {
  const results = await Promise.allSettled([
    // 0: Argentina Dólares Estándar
    fetchWithTimeout("https://dolarapi.com/v1/dolares"),
    // 1: Argentina Ámbito (actualización horaria / intradiaria con variación)
    fetchWithTimeout("https://dolarapi.com/v1/ambito/dolares"),
    // 2: Argentina Otras Cotizaciones (EUR, BRL, CLP, UYU)
    fetchWithTimeout("https://dolarapi.com/v1/cotizaciones"),
    // 3: Venezuela Dólares (Oficial BCV y Paralelo)
    fetchWithTimeout("https://ve.dolarapi.com/v1/dolares"),
    // 4: Colombia Cotizaciones
    fetchWithTimeout("https://co.dolarapi.com/v1/cotizaciones"),
    // 5: Chile Cotizaciones
    fetchWithTimeout("https://cl.dolarapi.com/v1/cotizaciones"),
    // 6: Uruguay Cotizaciones
    fetchWithTimeout("https://uy.dolarapi.com/v1/cotizaciones"),
    // 7: México Cotizaciones
    fetchWithTimeout("https://mx.dolarapi.com/v1/cotizaciones"),
    // 8: Bolivia Dólares
    fetchWithTimeout("https://bo.dolarapi.com/v1/dolares"),
    // 9: Brasil Cotações
    fetchWithTimeout("https://br.dolarapi.com/v1/cotacoes"),
  ]);

  const [
    arDolaresRes,
    arAmbitoRes,
    arCotizacionesRes,
    veDolaresRes,
    coRes,
    clRes,
    uyRes,
    mxRes,
    boRes,
    brRes,
  ] = results.map((r) => (r.status === "fulfilled" ? r.value : null));

  const rates = {
    USD: 1.0,
  };
  const ratesDates = {};
  const details = {
    argentina: [],
    venezuela: [],
    colombia: [],
    chile: [],
    uruguay: [],
    mexico: [],
    bolivia: [],
    brasil: [],
  };

  let successfulFetches = 0;

  // 1. ARGENTINA: fusionar Ámbito (horario intradiario) y Dólares generales
  const combinedArDolares = Array.isArray(arAmbitoRes) && arAmbitoRes.length > 0
    ? arAmbitoRes
    : Array.isArray(arDolaresRes)
    ? arDolaresRes
    : [];

  if (combinedArDolares.length > 0) {
    successfulFetches++;

    // Incluir otras monedas de Argentina (Euro, Real, etc.)
    const otherQuotes = Array.isArray(arCotizacionesRes)
      ? arCotizacionesRes.filter((item) => (item.moneda || "").toUpperCase() !== "USD")
      : [];
    details.argentina = [...combinedArDolares, ...otherQuotes];

    let blueRate = null;
    let oficialRate = null;
    let blueDate = null;
    let oficialDate = null;

    combinedArDolares.forEach((dolar) => {
      const venta = typeof dolar.venta === "number" ? dolar.venta : parseFloat(dolar.venta);
      const compra = typeof dolar.compra === "number" ? dolar.compra : parseFloat(dolar.compra);
      const rateVal = venta > 0 ? venta : compra > 0 ? compra : null;

      if (!rateVal) return;

      const dt = dolar.fechaActualizacion || dolar.fecha;
      const casa = (dolar.casa || "").toLowerCase();
      if (casa === "blue") {
        blueRate = rateVal;
        blueDate = dt;
        rates["ARS_BLUE"] = rateVal;
        if (dt) ratesDates["ARS_BLUE"] = dt;
      } else if (casa === "oficial" || casa === "bna") {
        oficialRate = rateVal;
        oficialDate = dt;
        rates["ARS_OFICIAL"] = rateVal;
        if (dt) ratesDates["ARS_OFICIAL"] = dt;
      } else if (casa === "bolsa" || casa === "mep") {
        rates["ARS_MEP"] = rateVal;
        rates["ARS_BOLSA"] = rateVal;
        if (dt) ratesDates["ARS_MEP"] = dt;
      } else if (casa === "contadoconliqui" || casa === "ccl") {
        rates["ARS_CCL"] = rateVal;
        if (dt) ratesDates["ARS_CCL"] = dt;
      } else if (casa === "tarjeta") {
        rates["ARS_TARJETA"] = rateVal;
        if (dt) ratesDates["ARS_TARJETA"] = dt;
      } else if (casa === "cripto") {
        rates["ARS_CRIPTO"] = rateVal;
        if (dt) ratesDates["ARS_CRIPTO"] = dt;
      } else if (casa === "mayorista") {
        rates["ARS_MAYORISTA"] = rateVal;
        if (dt) ratesDates["ARS_MAYORISTA"] = dt;
      }
    });

    // ARS principal: preferencia por Blue (mercado real libre) o fallback a Oficial
    const mainArs = blueRate || oficialRate;
    if (mainArs) {
      rates["ARS"] = mainArs;
      ratesDates["ARS"] = blueDate || oficialDate;
    }
  }

  // 2. VENEZUELA
  if (Array.isArray(veDolaresRes) && veDolaresRes.length > 0) {
    successfulFetches++;
    details.venezuela = veDolaresRes;

    let paraleloRate = null;
    let oficialRate = null;
    let paraleloDate = null;
    let oficialDate = null;

    veDolaresRes.forEach((item) => {
      const val = item.promedio || item.venta || item.compra;
      const rateVal = typeof val === "number" ? val : parseFloat(val);
      if (!rateVal || rateVal <= 0) return;

      const dt = item.fechaActualizacion;
      const fuente = (item.fuente || item.casa || "").toLowerCase();
      if (fuente === "paralelo") {
        paraleloRate = rateVal;
        paraleloDate = dt;
        rates["VES_PARALELO"] = rateVal;
        if (dt) ratesDates["VES_PARALELO"] = dt;
      } else if (fuente === "oficial" || fuente === "bcv") {
        oficialRate = rateVal;
        oficialDate = dt;
        rates["VES_OFICIAL"] = rateVal;
        if (dt) ratesDates["VES_OFICIAL"] = dt;
      }
    });

    // VES principal: preferencia por Paralelo o fallback a Oficial
    const mainVes = paraleloRate || oficialRate;
    if (mainVes) {
      rates["VES"] = mainVes;
      ratesDates["VES"] = paraleloDate || oficialDate;
    }
  }

  // 3. COLOMBIA
  if (Array.isArray(coRes) && coRes.length > 0) {
    successfulFetches++;
    details.colombia = coRes;

    const usdItem = coRes.find((item) => (item.moneda || "").toUpperCase() === "USD");
    if (usdItem) {
      const val = usdItem.venta || usdItem.compra || usdItem.ultimoCierre;
      const num = typeof val === "number" ? val : parseFloat(val);
      if (!isNaN(num) && num > 0) {
        rates["COP"] = num;
      }
    }
  }

  // 4. CHILE
  if (Array.isArray(clRes) && clRes.length > 0) {
    successfulFetches++;
    details.chile = clRes;

    const usdItem = clRes.find((item) => (item.moneda || "").toUpperCase() === "USD");
    if (usdItem) {
      const val = usdItem.venta || usdItem.compra || usdItem.ultimoCierre;
      const num = typeof val === "number" ? val : parseFloat(val);
      if (!isNaN(num) && num > 0) {
        rates["CLP"] = num;
      }
    }
  }

  // 5. URUGUAY
  if (Array.isArray(uyRes) && uyRes.length > 0) {
    successfulFetches++;
    details.uruguay = uyRes;

    const usdItem = uyRes.find((item) => (item.moneda || "").toUpperCase() === "USD");
    if (usdItem) {
      const val = usdItem.venta || usdItem.compra;
      const num = typeof val === "number" ? val : parseFloat(val);
      if (!isNaN(num) && num > 0) {
        rates["UYU"] = num;
      }
    }

    // Guaraní paraguayo cotizado en Uruguay
    const pygItem = uyRes.find((item) => (item.moneda || "").toUpperCase() === "PYG");
    if (pygItem && rates["UYU"]) {
      const pygVal = pygItem.venta || pygItem.compra;
      const pygNum = typeof pygVal === "number" ? pygVal : parseFloat(pygVal);
      if (!isNaN(pygNum) && pygNum > 0) {
        // 1 PYG = pygNum UYU => 1 USD = rates["UYU"] / pygNum PYG
        rates["PYG"] = rates["UYU"] / pygNum;
      }
    }
  }

  // 6. MÉXICO
  if (Array.isArray(mxRes) && mxRes.length > 0) {
    successfulFetches++;
    details.mexico = mxRes;

    const usdItem = mxRes.find((item) => (item.moneda || "").toUpperCase() === "USD");
    if (usdItem) {
      const val = usdItem.venta || usdItem.fix || usdItem.compra;
      const num = typeof val === "number" ? val : parseFloat(val);
      if (!isNaN(num) && num > 0) {
        rates["MXN"] = num;
      }
    }
  }

  // 7. BOLIVIA
  if (Array.isArray(boRes) && boRes.length > 0) {
    successfulFetches++;
    details.bolivia = boRes;

    let oficialRate = null;
    let binanceRate = null;

    boRes.forEach((item) => {
      const val = item.venta || item.compra;
      const num = typeof val === "number" ? val : parseFloat(val);
      if (!num || num <= 0) return;

      const casa = (item.casa || "").toLowerCase();
      if (casa === "binance") {
        binanceRate = num;
        rates["BOB_BINANCE"] = num;
      } else if (casa === "oficial") {
        oficialRate = num;
        rates["BOB_OFICIAL"] = num;
      }
    });

    const mainBob = binanceRate || oficialRate;
    if (mainBob) {
      rates["BOB"] = mainBob;
    }
  }

  // 8. BRASIL
  if (Array.isArray(brRes) && brRes.length > 0) {
    successfulFetches++;
    details.brasil = brRes;

    const usdItem = brRes.find((item) => (item.moeda || item.moneda || "").toUpperCase() === "USD");
    if (usdItem) {
      const val = usdItem.venda || usdItem.compra || usdItem.fechoAnterior;
      const num = typeof val === "number" ? val : parseFloat(val);
      if (!isNaN(num) && num > 0) {
        rates["BRL"] = num;
      }
    }
  }

  return {
    success: successfulFetches > 0,
    successfulFetches,
    rates,
    ratesDates,
    details,
    timestamp: Date.now(),
  };
}

/**
 * Monedas y variantes específicas aportadas por DolarApi
 */
export const DOLAR_API_CURRENCIES = [
  // Argentina
  {
    code: "ARS",
    name: "Peso Argentino (DolarApi)",
    symbol: "$",
    flag: "🇦🇷",
    type: "fiat",
    country: "Argentina",
    source: "dolarapi.com",
    category: "Fíat América Latina",
  },
  {
    code: "ARS_BLUE",
    name: "Dólar Blue (Argentina)",
    symbol: "$",
    flag: "🇦🇷",
    type: "fiat",
    country: "Argentina",
    source: "dolarapi.com",
    category: "Dólares Argentina",
  },
  {
    code: "ARS_OFICIAL",
    name: "Dólar Oficial (Argentina)",
    symbol: "$",
    flag: "🇦🇷",
    type: "fiat",
    country: "Argentina",
    source: "dolarapi.com",
    category: "Dólares Argentina",
  },
  {
    code: "ARS_MEP",
    name: "Dólar Bolsa / MEP (Argentina)",
    symbol: "$",
    flag: "🇦🇷",
    type: "fiat",
    country: "Argentina",
    source: "dolarapi.com",
    category: "Dólares Argentina",
  },
  {
    code: "ARS_CCL",
    name: "Dólar CCL (Argentina)",
    symbol: "$",
    flag: "🇦🇷",
    type: "fiat",
    country: "Argentina",
    source: "dolarapi.com",
    category: "Dólares Argentina",
  },
  {
    code: "ARS_TARJETA",
    name: "Dólar Tarjeta (Argentina)",
    symbol: "$",
    flag: "🇦🇷",
    type: "fiat",
    country: "Argentina",
    source: "dolarapi.com",
    category: "Dólares Argentina",
  },
  {
    code: "ARS_CRIPTO",
    name: "Dólar Cripto (Argentina)",
    symbol: "$",
    flag: "🇦🇷",
    type: "fiat",
    country: "Argentina",
    source: "dolarapi.com",
    category: "Dólares Argentina",
  },
  // Venezuela
  {
    code: "VES",
    name: "Bolívar Venezolano (DolarApi)",
    symbol: "Bs.",
    flag: "🇻🇪",
    type: "fiat",
    country: "Venezuela",
    source: "dolarapi.com",
    category: "Fíat América Latina",
  },
  {
    code: "VES_PARALELO",
    name: "Dólar Paralelo (Venezuela)",
    symbol: "Bs.",
    flag: "🇻🇪",
    type: "fiat",
    country: "Venezuela",
    source: "dolarapi.com",
    category: "Dólares Venezuela",
  },
  {
    code: "VES_OFICIAL",
    name: "Dólar Oficial BCV (Venezuela)",
    symbol: "Bs.",
    flag: "🇻🇪",
    type: "fiat",
    country: "Venezuela",
    source: "dolarapi.com",
    category: "Dólares Venezuela",
  },
  // Colombia
  {
    code: "COP",
    name: "Peso Colombiano (DolarApi)",
    symbol: "$",
    flag: "🇨🇴",
    type: "fiat",
    country: "Colombia",
    source: "dolarapi.com",
    category: "Fíat América Latina",
  },
  // Chile
  {
    code: "CLP",
    name: "Peso Chileno (DolarApi)",
    symbol: "$",
    flag: "🇨🇱",
    type: "fiat",
    country: "Chile",
    source: "dolarapi.com",
    category: "Fíat América Latina",
  },
  // Uruguay
  {
    code: "UYU",
    name: "Peso Uruguayo (DolarApi)",
    symbol: "$U",
    flag: "🇺🇾",
    type: "fiat",
    country: "Uruguay",
    source: "dolarapi.com",
    category: "Fíat América Latina",
  },
  // México
  {
    code: "MXN",
    name: "Peso Mexicano (DolarApi)",
    symbol: "$",
    flag: "🇲🇽",
    type: "fiat",
    country: "México",
    source: "dolarapi.com",
    category: "Fíat América Latina",
  },
  // Bolivia
  {
    code: "BOB",
    name: "Boliviano (DolarApi)",
    symbol: "Bs",
    flag: "🇧🇴",
    type: "fiat",
    country: "Bolivia",
    source: "dolarapi.com",
    category: "Fíat América Latina",
  },
  {
    code: "BOB_BINANCE",
    name: "Dólar Binance P2P (Bolivia)",
    symbol: "Bs",
    flag: "🇧🇴",
    type: "fiat",
    country: "Bolivia",
    source: "dolarapi.com",
    category: "Dólares Bolivia",
  },
  {
    code: "BOB_OFICIAL",
    name: "Dólar Oficial (Bolivia)",
    symbol: "Bs",
    flag: "🇧🇴",
    type: "fiat",
    country: "Bolivia",
    source: "dolarapi.com",
    category: "Dólares Bolivia",
  },
  // Brasil
  {
    code: "BRL",
    name: "Real Brasileño (DolarApi)",
    symbol: "R$",
    flag: "🇧🇷",
    type: "fiat",
    country: "Brasil",
    source: "dolarapi.com",
    category: "Fíat América Latina",
  },
];

/**
 * Formateador amigable de fechas de actualización de DolarApi
 */
export function formatQuoteDate(dateString) {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (isToday) {
      return `Hoy a las ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Ayer a las ${timeStr}`;
    }

    return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} a las ${timeStr}`;
  } catch {
    return null;
  }
}

