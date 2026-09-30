// src/components/BackgroundPattern.jsx
export default function BackgroundPattern() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-950 pointer-events-none select-none">
      {/* SVG con patrón de marcas de agua de símbolos */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.06]"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="currency-symbols-pattern"
            width="160"
            height="160"
            patternUnits="userSpaceOnUse"
          >
            {/* Fíat */}
            <text x="20" y="30" fill="#cec87cbc" fontSize="22" fontWeight="bold">$</text>
            <text x="90" y="35" fill="#cec87cbc" fontSize="20" fontWeight="bold">€</text>
            <text x="140" y="80" fill="#cec87cbc" fontSize="18" fontWeight="bold">£</text>
            <text x="30" y="110" fill="#cec87cbc" fontSize="20" fontWeight="bold">¥</text>
            <text x="80" y="145" fill="#cec87cbc" fontSize="18" fontWeight="bold">Bs.</text>
            <text x="10" y="70" fill="#cec87cbc" fontSize="16" fontWeight="bold">S/</text>
            <text x="120" y="130" fill="#cec87cbc" fontSize="18" fontWeight="bold">₹</text>

            {/* Criptos */}
            <text x="60" y="75" fill="#cec87cbc" fontSize="24" fontWeight="bold">₿</text>
            <text x="110" y="20" fill="#cec87cbc" fontSize="20" fontWeight="bold">Ξ</text>
            <text x="130" y="100" fill="#cec87cbc" fontSize="18" fontWeight="bold">◎</text>
            <text x="70" y="120" fill="#cec87cbc" fontSize="16" fontWeight="bold">₳</text>
            <text x="15" y="150" fill="#cec87cbc" fontSize="16" fontWeight="bold">Ð</text>
            <text x="100" y="90" fill="#cec87cbc" fontSize="18" fontWeight="bold">₮</text>
            <text x="40" y="45" fill="#cec87cbc" fontSize="15" fontWeight="bold">Ł</text>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#currency-symbols-pattern)" />
      </svg>

      {/* Brillos sutiles de degradado ambiental */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 right-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" />
    </div>
  );
}