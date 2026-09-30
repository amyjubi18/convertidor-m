import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Star,
  Check,
  Coins,
  Banknote,
  X,
} from "lucide-react";
import { getCurrencyInfo } from "../data/currencies";

export default function CurrencyDropdown({
  currencies,
  currency,
  setCurrency,
  favorites,
  handleFavorite,
  title = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'crypto' | 'fiat' | 'favorites'
  const [displayLimit, setDisplayLimit] = useState(50);
  const [failedImages, setFailedImages] = useState({});

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const listContainerRef = useRef(null);

  const selectedInfo = useMemo(
    () => getCurrencyInfo(currency),
    [currency]
  );

  const isFavorite = useCallback(
    (currCode) => favorites.includes(currCode),
    [favorites]
  );

  // Cerrar el dropdown al hacer clic fuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Conteo dinámico para pestañas
  const counts = useMemo(() => {
    let fiat = 0;
    let crypto = 0;
    currencies.forEach((code) => {
      const info = getCurrencyInfo(code);
      if (info.type === "crypto") crypto++;
      else fiat++;
    });
    return { all: currencies.length, fiat, crypto, favs: favorites.length };
  }, [currencies, favorites]);

  // Filtrar lista según pestaña activa y query de búsqueda
  const filteredCurrencies = useMemo(() => {
    const q = search.trim().toLowerCase();

    return currencies
      .map((code) => getCurrencyInfo(code))
      .filter((item) => {
        // Filtro por pestañas
        if (activeTab === "favorites" && !isFavorite(item.code)) return false;
        if (activeTab === "crypto" && item.type !== "crypto") return false;
        if (activeTab === "fiat" && item.type !== "fiat") return false;

        // Filtro por búsqueda
        if (!q) return true;
        return (
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.country && item.country.toLowerCase().includes(q))
        );
      });
  }, [currencies, search, activeTab, isFavorite]);

  // Paginación para alto rendimiento con +1000 elementos
  const visibleItems = useMemo(() => {
    if (search.trim()) return filteredCurrencies;
    return filteredCurrencies.slice(0, displayLimit);
  }, [filteredCurrencies, displayLimit, search]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollTop + clientHeight >= scrollHeight - 60 &&
      displayLimit < filteredCurrencies.length
    ) {
      setDisplayLimit((prev) => prev + 40);
    }
  };

  const handleImageError = (code) => {
    setFailedImages((prev) => ({ ...prev, [code]: true }));
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {title && (
        <label className="block text-xs font-semibold tracking-wider uppercase text-slate-400 mb-2">
          {title}
        </label>
      )}

      {/* Botón principal de selección */}
      <div className="relative group">
        <button
          type="button"
          onClick={() => {
            setDisplayLimit(50);
            setIsOpen((prev) => !prev);
          }}
          className="w-full flex items-center justify-between p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 rounded-2xl shadow-lg transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm shrink-0 overflow-hidden ${
                selectedInfo.type === "fiat"
                  ? "bg-slate-700/90 text-xl"
                  : selectedInfo.iconBg || "bg-indigo-600 text-white"
              }`}
            >
              {selectedInfo.type === "crypto" && !failedImages[selectedInfo.code] ? (
                <img
                  src={`https://cryptoicons.org/api/icon/${selectedInfo.code.toLowerCase()}/200`}
                  alt={selectedInfo.code}
                  onError={() => handleImageError(selectedInfo.code)}
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <span>{selectedInfo.flag || selectedInfo.symbol}</span>
              )}
            </div>

            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide text-base">
                  {selectedInfo.code}
                </span>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    selectedInfo.type === "crypto"
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {selectedInfo.type === "crypto" ? "Cripto" : "Fíat"}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {selectedInfo.name}{" "}
                {selectedInfo.country ? `• ${selectedInfo.country}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pl-1">
            <button
              type="button"
              title={
                isFavorite(selectedInfo.code)
                  ? "Quitar de favoritos"
                  : "Añadir a favoritos"
              }
              onClick={(e) => {
                e.stopPropagation();
                handleFavorite(selectedInfo.code);
              }}
              className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors rounded-lg hover:bg-slate-700/50 cursor-pointer"
            >
              <Star
                className={`w-4 h-4 ${
                  isFavorite(selectedInfo.code)
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-400"
                }`}
              />
            </button>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-indigo-400" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Panel desplegable */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full sm:w-[380px] left-0 bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Barra de búsqueda */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar (ej. VES, BTC, Euro, México, Sol)..."
                className="w-full bg-slate-800/90 text-sm text-white placeholder-slate-400 pl-9 pr-8 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtros por pestaña */}
            <div className="flex gap-1 mt-2.5 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all text-center cursor-pointer ${
                  activeTab === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                Todas ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("crypto")}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-medium transition-all text-center cursor-pointer ${
                  activeTab === "crypto"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-purple-300 hover:bg-slate-800"
                }`}
              >
                <Coins className="w-3 h-3" />
                <span>Cripto ({counts.crypto})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("fiat")}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-medium transition-all text-center cursor-pointer ${
                  activeTab === "fiat"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-emerald-300 hover:bg-slate-800"
                }`}
              >
                <Banknote className="w-3 h-3" />
                <span>Fíat ({counts.fiat})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("favorites")}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg font-medium transition-all text-center cursor-pointer ${
                  activeTab === "favorites"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                }`}
              >
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>Favs ({counts.favs})</span>
              </button>
            </div>
          </div>

          {/* Lista de opciones */}
          <div
            ref={listContainerRef}
            onScroll={handleScroll}
            className="max-h-72 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-800/40"
          >
            {filteredCurrencies.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No se encontraron monedas para tu búsqueda.
              </div>
            ) : (
              visibleItems.map((item) => {
                const selected = item.code === currency;
                const fav = isFavorite(item.code);

                return (
                  <div
                    key={item.code}
                    onClick={() => {
                      setCurrency(item.code);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                      selected
                        ? "bg-indigo-950/70 border border-indigo-500/40 text-white"
                        : "hover:bg-slate-800/70 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden ${
                          item.type === "fiat"
                            ? "bg-slate-800 text-base"
                            : item.iconBg || "bg-indigo-600 text-white"
                        }`}
                      >
                        {item.type === "crypto" && !failedImages[item.code] ? (
                          <img
                            src={`https://cryptoicons.org/api/icon/${item.code.toLowerCase()}/200`}
                            alt={item.code}
                            onError={() => handleImageError(item.code)}
                            className="w-5 h-5 object-contain"
                          />
                        ) : (
                          <span>{item.flag || item.symbol}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white text-sm">
                            {item.code}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              item.type === "crypto"
                                ? "bg-purple-500/20 text-purple-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {item.type === "crypto" ? "Cripto" : "Fíat"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {item.name}{" "}
                          {item.country ? `• ${item.country}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFavorite(item.code);
                        }}
                        className="p-1 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                        title={
                          fav
                            ? "Quitar de favoritos"
                            : "Marcar como favorito"
                        }
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            fav
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-500"
                          }`}
                        />
                      </button>
                      {selected && (
                        <Check className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {filteredCurrencies.length > visibleItems.length && (
              <div className="p-2 text-center text-slate-500 text-[11px]">
                Desplaza hacia abajo para ver más ({filteredCurrencies.length - visibleItems.length} restantes)...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}