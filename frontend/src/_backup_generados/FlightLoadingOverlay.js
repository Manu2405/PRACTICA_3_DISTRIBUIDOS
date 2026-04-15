import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function FlightLoadingOverlay(_a) {
    var _b = _a.message, message = _b === void 0 ? 'Buscando rutas…' : _b;
    return (_jsxs("div", { className: "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-slate-950/80 backdrop-blur-md", role: "status", "aria-live": "polite", "aria-busy": "true", children: [_jsx("div", { className: "sarp-loading-plane text-6xl drop-shadow-[0_0_24px_rgba(34,211,238,0.5)]", "aria-hidden": true, children: "\u2708" }), _jsx("p", { className: "text-sm font-semibold tracking-wide text-cyan-200", children: message }), _jsx("div", { className: "h-1 w-48 overflow-hidden rounded-full bg-slate-800", children: _jsx("div", { className: "sarp-load-bar-inner h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400" }) })] }));
}
