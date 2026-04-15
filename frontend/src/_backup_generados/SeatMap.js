import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { isSeatSelectable } from '../utils';
import { translations } from '../i18n';
var stateStyles = {
    free: 'cursor-pointer border-indigo-300 bg-indigo-500 text-white shadow-sm shadow-indigo-950/50 hover:brightness-110 hover:ring-2 hover:ring-indigo-200',
    reserved: 'cursor-not-allowed border-orange-400 bg-orange-500/35 text-orange-50 ring-1 ring-orange-400/60',
    sold: 'cursor-not-allowed border-teal-400 bg-teal-600/90 text-teal-50 shadow-sm shadow-teal-950/30',
    refund: 'cursor-not-allowed border-rose-400 bg-rose-600/40 text-rose-50 ring-1 ring-rose-300/50 animate-pulse',
};
export default function SeatMap(_a) {
    var lang = _a.lang, seatMatrix = _a.seatMatrix, seatState = _a.seatState, selectedSeat = _a.selectedSeat, onSelectSeat = _a.onSelectSeat, firstClassSeats = _a.firstClassSeats, columns = _a.columns;
    var t = translations[lang];
    var firstClassRows = Math.ceil(firstClassSeats / 6);
    var totalRows = seatMatrix.length;
    // Section distribution
    var _b = useState('front'), currentSection = _b[0], setCurrentSection = _b[1];
    var visibleRows = useMemo(function () {
        var segment = Math.ceil(totalRows / 3);
        if (currentSection === 'front')
            return seatMatrix.slice(0, segment);
        if (currentSection === 'middle')
            return seatMatrix.slice(segment, segment * 2);
        return seatMatrix.slice(segment * 2);
    }, [currentSection, seatMatrix, totalRows]);
    var sectionStartIndex = useMemo(function () {
        var segment = Math.ceil(totalRows / 3);
        if (currentSection === 'front')
            return 0;
        if (currentSection === 'middle')
            return segment;
        return segment * 2;
    }, [currentSection, totalRows]);
    return (_jsxs("div", { className: "relative md:px-8 animate-fade-in", children: [_jsx("div", { className: "flex justify-center gap-1 mb-6 p-1.5 bg-slate-900/60 rounded-2xl border border-white/5 ring-1 ring-white/5 backdrop-blur-sm max-w-xs mx-auto", children: ['front', 'middle', 'rear'].map(function (s) { return (_jsx("button", { onClick: function () { return setCurrentSection(s); }, className: "flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ".concat(currentSection === s
                        ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                        : 'text-slate-500 hover:text-slate-300'), children: t[s] }, s)); }) }), _jsxs("div", { className: "mx-auto w-full transition-all duration-500 flex flex-col items-center ".concat(columns > 6 ? 'max-w-2xl' : 'max-w-sm'), children: [_jsxs("div", { className: "w-full flex justify-between items-center px-4 mb-2 text-[10px] font-black uppercase tracking-tighter text-slate-500", children: [_jsxs("span", { children: [translations[lang].availability, ": ", seatMatrix.length * columns, " ", translations[lang].seats_sold.split(' ')[0]] }), _jsxs("span", { children: [columns === 4 ? '2-2' : columns === 6 ? '3-3' : '3-4-3', " Layout"] })] }), currentSection === 'front' && (_jsxs("div", { className: "w-1/2 h-14 bg-slate-800 rounded-t-[100px] flex flex-col items-center justify-end border-t-[6px] border-slate-700 shadow-inner pb-2 relative overflow-hidden animate-fade-in-down", children: [_jsxs("div", { className: "absolute top-2 w-full flex justify-center gap-1 opacity-20", children: [_jsx("div", { className: "w-6 h-4 bg-cyan-400 rounded-sm skew-x-[-20deg]" }), _jsx("div", { className: "w-8 h-5 bg-cyan-400 rounded-sm" }), _jsx("div", { className: "w-6 h-4 bg-cyan-400 rounded-sm skew-x-[20deg]" })] }), _jsx("span", { className: "text-[8px] font-black text-slate-500 uppercase tracking-widest", children: lang === 'es' ? 'Cabina' : lang === 'en' ? 'Cockpit' : 'Cabine' }), _jsx("div", { className: "absolute -bottom-1 w-full text-center", children: _jsx("span", { className: "text-[6px] font-black text-cyan-400/40 uppercase tracking-[0.3em] truncate px-4 block", children: translations[lang].aircraft }) })] })), _jsxs("div", { className: "w-full bg-slate-800/40 p-4 border-x-[6px] border-slate-600 shadow-inner relative transition-all duration-500 ".concat(currentSection === 'front' ? 'rounded-t-2xl' : currentSection === 'rear' ? 'rounded-b-2xl' : ''), children: [currentSection === 'middle' && (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute -left-24 top-1/2 -translate-y-1/2 w-24 h-64 pointer-events-none hidden md:block animate-fade-in-left", children: _jsx("div", { className: "w-full h-full bg-gradient-to-r from-transparent via-slate-700/30 to-slate-600/70", style: { clipPath: 'polygon(100% 25%, 0% 100%, 100% 75%)' } }) }), _jsx("div", { className: "absolute -right-24 top-1/2 -translate-y-1/2 w-24 h-64 pointer-events-none hidden md:block animate-fade-in-right", children: _jsx("div", { className: "w-full h-full bg-gradient-to-l from-transparent via-slate-700/30 to-slate-600/70", style: { clipPath: 'polygon(0% 25%, 100% 100%, 0% 75%)' } }) })] })), _jsx("div", { className: "grid gap-2 pr-1", children: visibleRows.map(function (row, relativeIndex) {
                                    var rowIndex = sectionStartIndex + relativeIndex;
                                    var isFirstClass = rowIndex < firstClassRows;
                                    return (_jsxs("div", { className: "space-y-2", children: [rowIndex === 0 && isFirstClass && (_jsxs("div", { className: "text-center py-2 text-[9px] uppercase font-black text-amber-500/80 tracking-[0.2em] mb-2 flex items-center justify-center gap-2", children: [_jsx("span", { className: "h-px w-8 bg-amber-500/20" }), t.first_class, _jsx("span", { className: "h-px w-8 bg-amber-500/20" })] })), rowIndex === firstClassRows && (_jsxs("div", { className: "text-center py-2 text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] mb-2 mt-4 flex items-center justify-center gap-2", children: [_jsx("span", { className: "h-px w-8 bg-slate-700/40" }), t.economy, _jsx("span", { className: "h-px w-8 bg-slate-700/40" })] })), _jsx("div", { className: "grid gap-2 ".concat(columns === 4 ? 'grid-cols-4' : columns === 6 ? 'grid-cols-6' : 'grid-cols-10'), children: row.map(function (seat) {
                                                    var _a;
                                                    var state = (_a = seatState[seat]) !== null && _a !== void 0 ? _a : 'free';
                                                    var selectable = isSeatSelectable(state);
                                                    var isSelected = selectedSeat === seat;
                                                    var base = stateStyles[state];
                                                    var selectedRing = isSelected && selectable ? ' ring-2 ring-white ring-offset-[3px] ring-offset-slate-900 border-white scale-110 z-10' : '';
                                                    return (_jsxs("button", { type: "button", disabled: !selectable, title: "".concat(seat, ": ").concat(state), onClick: function () { return onSelectSeat(seat); }, className: "group relative rounded-xl border px-1 py-3 text-[10px] sm:text-xs font-black transition-all duration-200 active:scale-90 flex items-center justify-center ".concat(base).concat(selectedRing), children: [isFirstClass && state === 'free' && (_jsx("svg", { className: "absolute -top-1 -right-1 w-3 h-3 text-amber-400 drop-shadow-md", viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }) })), _jsx("span", { className: isFirstClass ? 'text-white' : '', children: seat })] }, seat));
                                                }) })] }, rowIndex));
                                }) })] }), currentSection === 'rear' && (_jsx("div", { className: "w-3/4 h-10 bg-slate-800 rounded-b-[60px] flex items-end justify-center pb-2 mt-px border-b-[4px] border-slate-700 animate-fade-in-up" }))] })] }));
}
export function SeatStateLegend(_a) {
    var lang = _a.lang;
    var t = translations[lang];
    var items = [
        { color: 'bg-indigo-500', label: t.free_economy },
        { color: 'bg-indigo-500', label: t.free_first, icon: true },
        { color: 'bg-orange-500/50', label: t.reservations },
        { color: 'bg-teal-600', label: t.seats_sold.split(' ')[0] },
        { color: 'bg-rose-600/50', label: lang === 'es' ? 'Devolución' : lang === 'en' ? 'Refund' : 'Reembolso' },
    ];
    return (_jsx("div", { className: "grid gap-2 grid-cols-2 sm:grid-cols-3", children: items.map(function (_a) {
            var color = _a.color, label = _a.label, icon = _a.icon;
            return (_jsxs("div", { className: "flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 border border-white/5 shadow-sm", children: [_jsxs("div", { className: "relative", children: [_jsx("span", { className: "block h-3 w-3 rounded-full ".concat(color) }), icon && (_jsx("svg", { className: "absolute -top-1 -right-1 w-2.5 h-2.5 text-amber-400", viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }) }))] }), _jsx("p", { className: "text-[10px] font-black text-slate-300 uppercase tracking-tight", children: label })] }, label));
        }) }));
}
