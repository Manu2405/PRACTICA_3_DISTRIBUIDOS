import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function BrandMark(_a) {
    var name = _a.name, tagline = _a.tagline, shortName = _a.shortName, iconSrc = _a.iconSrc;
    var _b = useState(false), imgFailed = _b[0], setImgFailed = _b[1];
    var showImage = Boolean(iconSrc) && !imgFailed;
    return (_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "brand-mark-icon relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-teal-700 shadow-lg shadow-teal-900/40 ring-2 ring-white/30", "aria-hidden": true, children: [showImage ? (_jsx("img", { src: iconSrc, alt: "", className: "sarp-brand-img h-full w-full object-cover", onError: function () { return setImgFailed(true); } })) : (_jsx("svg", { viewBox: "0 0 48 48", className: "sarp-wing-drift h-9 w-9 text-white drop-shadow-md", fill: "currentColor", children: _jsx("path", { d: "M4 24 L20 18 L38 8 L40 12 L26 22 L36 28 L34 32 L18 26 L12 36 L8 34 L14 22 Z", opacity: "0.95" }) })), _jsx("span", { className: "absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 rounded bg-white/90 px-1.5 py-px text-[9px] font-black text-teal-800", children: shortName })] }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl", children: name }), _jsxs("p", { className: "mt-1 text-sm text-teal-200/80", children: [shortName, " \u00B7 ", tagline] })] })] }));
}
