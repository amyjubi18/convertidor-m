// src/App.jsx
import CurrencyConverter from "./components/currency-convertor";
import BackgroundPattern from "./components/BackgroundPattern";

function App() {
  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans overflow-x-hidden">
      {/* Fondo con marcas de agua sutiles */}
      <BackgroundPattern />

      {/* Calculadora */}
      <div className="w-full max-w-2xl z-10">
        <CurrencyConverter />
      </div>
    </div>
  );
}

export default App;