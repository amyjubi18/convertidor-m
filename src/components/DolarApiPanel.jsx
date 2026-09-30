// src/components/DolarApiPanel.jsx
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function DolarApiPanel({
  dolarApiDetails,
  onSelectCurrencyPair,
  isRefreshing,
  activeCurrency,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("argentina");

  if (!dolarApiDetails) return null;

  const countries = [
    { id: "argentina", name: "Argentina", flag: "🇦🇷", code: "ARS" },
    { id: "venezuela", name: "Venezuela", flag: "🇻🇪", code: "VES" },
    { id: "colombia", name: "Colombia", flag: "🇨🇴", code: "COP" },
    { id: "chile", name: "Chile", flag: "🇨🇱", code: "CLP" },
    { id: "mexico", name: "México", flag: "🇲🇽", code: "MXN" },
    { id: "brasil", name: "Brasil", flag: "🇧🇷", code: "BRL" },
    { id: "uruguay", name: "Uruguay", flag: "🇺🇾", code: "UYU" },
    { id: "bolivia", name: "Bolivia", flag: "🇧🇴", code: "BOB" },
  ];

  const currentQuotes = dolarApiDetails[selectedCountry] || [];

  return (
    <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl overflow-hidden transition-all">
      {/* Cabecera del Panel DolarApi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Cotizaciones Fíat DolarApi.com
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                API Conectada
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Datos oficiales y paralelos en tiempo real para 8 países de LatAm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <a
            href="https://dolarapi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-400 transition-colors"
            title="Ir a DolarApi.com"
          >
            <span>dolarapi.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition-all cursor-pointer"
          >
            <span>{isOpen ? "Ocultar" : "Ver Cotizaciones"}</span>
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
            )}
          </button>
        </div>
      </div>

      {/* Contenido expandible */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 animate-in fade-in duration-200">
          {/* Tabs de países */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {countries.map((c) => {
              const count = (dolarApiDetails[c.id] || []).length;
              const isSelected = selectedCountry === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCountry(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40"
                      : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80 border border-slate-700/60"
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? "bg-indigo-700/80 text-white"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Grilla de cotizaciones para el país seleccionado */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {currentQuotes.length === 0 ? (
              <div className="col-span-full p-4 text-center text-xs text-slate-400">
                Cargando o no hay cotizaciones disponibles para esta región...
              </div>
            ) : (
              currentQuotes.map((q, idx) => {
                const title =
                  q.nombre ||
                  q.nome ||
                  q.casa ||
                  q.fuente ||
                  q.moneda ||
                  q.moeda ||
                  "Cotización";
                const compra = q.compra;
                const venta = q.venta ?? q.venda ?? q.promedio ?? q.ultimoCierre ?? q.fechoAnterior;
                const date = q.fechaActualizacion || q.dataAtualizacao;

                // Determinar código objetivo para aplicar al hacer clic
                let targetCode = "USD";
                if (selectedCountry === "argentina") {
                  const casaLower = (q.casa || "").toLowerCase();
                  if (casaLower === "blue") targetCode = "ARS_BLUE";
                  else if (casaLower === "oficial") targetCode = "ARS_OFICIAL";
                  else if (casaLower === "bolsa" || casaLower === "mep") targetCode = "ARS_MEP";
                  else if (casaLower === "contadoconliqui" || casaLower === "ccl") targetCode = "ARS_CCL";
                  else if (casaLower === "tarjeta") targetCode = "ARS_TARJETA";
                  else if (casaLower === "cripto") targetCode = "ARS_CRIPTO";
                  else targetCode = "ARS";
                } else if (selectedCountry === "venezuela") {
                  const fuenteLower = (q.fuente || q.casa || "").toLowerCase();
                  if (fuenteLower === "paralelo") targetCode = "VES_PARALELO";
                  else targetCode = "VES_OFICIAL";
                } else if (selectedCountry === "bolivia") {
                  const casaLower = (q.casa || "").toLowerCase();
                  if (casaLower === "binance") targetCode = "BOB_BINANCE";
                  else targetCode = "BOB_OFICIAL";
                } else if (selectedCountry === "colombia") {
                  targetCode = "COP";
                } else if (selectedCountry === "chile") {
                  targetCode = "CLP";
                } else if (selectedCountry === "uruguay") {
                  targetCode = "UYU";
                } else if (selectedCountry === "mexico") {
                  targetCode = "MXN";
                } else if (selectedCountry === "brasil") {
                  targetCode = "BRL";
                }

                const isCurrentlyActive =
                  activeCurrency === targetCode ||
                  (activeCurrency === "ARS" && targetCode.startsWith("ARS")) ||
                  (activeCurrency === "VES" && targetCode.startsWith("VES"));

                return (
                  <div
                    key={`${selectedCountry}-${idx}-${title}`}
                    onClick={() => onSelectCurrencyPair && onSelectCurrencyPair("USD", targetCode)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                      isCurrentlyActive
                        ? "bg-indigo-950/70 border-indigo-500/60 shadow-lg shadow-indigo-600/10"
                        : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600"
                    }`}
                    title={`Click para convertir USD a ${title}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {title}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        {targetCode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {compra != null && (
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-sans">
                            Compra
                          </span>
                          <span className="text-slate-200 font-semibold">
                            ${compra.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {venta != null && (
                        <div
                          className={`bg-slate-900/60 p-1.5 rounded-lg border border-slate-800 ${
                            compra == null ? "col-span-2" : ""
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 block font-sans">
                            {q.promedio != null ? "Promedio" : "Venta"}
                          </span>
                          <span className="text-white font-bold text-sm text-indigo-300">
                            ${venta.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
                        <Zap className="w-2.5 h-2.5" />
                        Usar en calculadora
                      </span>
                      {date && (
                        <span className="truncate max-w-[120px]">
                          {new Date(date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
