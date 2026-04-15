var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useId, useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
function nodeClasses(code, path, origin, destination) {
    var _a;
    var onPath = (_a = path === null || path === void 0 ? void 0 : path.includes(code)) !== null && _a !== void 0 ? _a : false;
    if (code === origin) {
        return 'w-2.5 h-2.5 rounded-full bg-sky-400 shadow-lg shadow-sky-500/50 ring-[1.5px] ring-white border border-white/40 scale-110 route-node-pulse';
    }
    if (code === destination) {
        return 'w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/50 ring-[1.5px] ring-white border border-white/40 scale-110 route-node-pulse';
    }
    if (onPath) {
        return 'w-2 h-2 rounded-full bg-cyan-300 shadow-md shadow-cyan-500/40 border border-white/30';
    }
    return 'w-1.5 h-1.5 rounded-full bg-slate-600 border border-white/10';
}
function MapOverlay(_a) {
    var _b;
    var cities = _a.cities, origin = _a.origin, destination = _a.destination, path = _a.path;
    var map = useMap();
    var uid = useId().replace(/:/g, '');
    var gradId = "routeGrad-".concat(uid);
    var pathId = "routeMotion-".concat(uid);
    var _c = useState(0), tick = _c[0], setTick = _c[1];
    useEffect(function () {
        var frameId;
        var handler = function () {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(function () {
                setTick(function (t) { return t + 1; });
            });
        };
        map.on('move zoom resize', handler);
        // Disparar un renderizado inicial asegurándonos de que haya cargado bounds
        setTimeout(handler, 100);
        return function () {
            cancelAnimationFrame(frameId);
            map.off('move zoom resize', handler);
        };
    }, [map]);
    useEffect(function () {
        if (path && path.length > 0) {
            var coords = path.map(function (code) {
                var c = cities.find(function (x) { return x.code === code; });
                return c ? [c.lat, c.lng] : null;
            }).filter(Boolean);
            if (coords.length > 0) {
                map.fitBounds(coords, { padding: [60, 60], animate: true, maxZoom: 6 });
            }
        }
        else {
            map.setView([20, 0], window.innerWidth < 600 ? 1 : 2);
        }
    }, [map, path, cities]);
    var pixelNodes = useMemo(function () {
        return cities.map(function (city) {
            var pt = map.latLngToContainerPoint([city.lat, city.lng]);
            return __assign(__assign({}, city), { px: pt.x, py: pt.y });
        });
    }, [map, cities, tick]);
    var motionPathD = useMemo(function () {
        if (!(path === null || path === void 0 ? void 0 : path.length))
            return '';
        var parts = path
            .map(function (code, i) {
            var c = pixelNodes.find(function (x) { return x.code === code; });
            if (!c)
                return '';
            return "".concat(i === 0 ? 'M' : 'L', " ").concat(c.px, " ").concat(c.py);
        })
            .filter(Boolean);
        return parts.join(' ');
    }, [path, pixelNodes]);
    var segments = (_b = path === null || path === void 0 ? void 0 : path.map(function (code, index) {
        var city = pixelNodes.find(function (c) { return c.code === code; });
        var nextCode = path[index + 1];
        var nextCity = nextCode ? pixelNodes.find(function (c) { return c.code === nextCode; }) : undefined;
        if (!city || !nextCity)
            return null;
        return (_jsx("line", { x1: city.px, y1: city.py, x2: nextCity.px, y2: nextCity.py, stroke: "url(#".concat(gradId, ")"), className: "route-flow-line", vectorEffect: "non-scaling-stroke" }, "".concat(code, "-").concat(nextCode)));
    })) !== null && _b !== void 0 ? _b : [];
    var mapPoints = pixelNodes.map(function (city) {
        var labelMuted = !(path === null || path === void 0 ? void 0 : path.includes(city.code));
        var label = city.code === origin
            ? "".concat(city.code)
            : city.code === destination
                ? "".concat(city.code)
                : city.code;
        // Solo dibujar si está en el viewport para evitar bugs de DOM
        if (city.px < -200 || city.py < -200 || city.px > window.innerWidth + 200)
            return null;
        return (_jsxs("div", { className: "absolute z-10 text-[8px] leading-tight ".concat(labelMuted ? 'text-slate-500 opacity-60' : 'text-slate-50 opacity-100'), style: { left: city.px, top: city.py, transform: 'translate(-50%, -50%)' }, children: [_jsx("div", { className: "mx-auto ".concat(nodeClasses(city.code, path, origin, destination)) }), _jsx("span", { className: "mt-1 block max-w-[4rem] text-center font-semibold drop-shadow", children: label })] }, city.code));
    });
    return (_jsxs("div", { className: "absolute inset-0 z-[1000] pointer-events-none w-full h-full", children: [_jsx("div", { className: "pointer-events-none absolute inset-0 z-[1] opacity-30 bg-[radial-gradient(ellipse_at_30%_20%,rgba(56,189,248,0.25),transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(99,102,241,0.20),transparent_45%)]", "aria-hidden": true }), _jsxs("svg", { className: "absolute inset-0 z-[2] w-full h-full", "aria-hidden": true, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: gradId, x1: "0%", y1: "0%", x2: "100%", y2: "0%", children: [_jsx("stop", { offset: "0%", stopColor: "rgb(56 189 248)", stopOpacity: "0.95" }), _jsx("stop", { offset: "50%", stopColor: "rgb(34 211 238)", stopOpacity: "0.9" }), _jsx("stop", { offset: "100%", stopColor: "rgb(129 140 248)", stopOpacity: "0.95" })] }) }), segments, motionPathD ? (_jsxs(_Fragment, { children: [_jsx("path", { id: pathId, d: motionPathD, fill: "none", stroke: "none" }), _jsxs("g", { children: [_jsx("animateMotion", { dur: "12s", repeatCount: "indefinite", rotate: "auto", children: _jsx("mpath", { href: "#".concat(pathId) }) }), _jsx("g", { transform: "translate(-8,-6) scale(2)", children: _jsx("path", { d: "M4.6 1.7L4.6 2.5L2 4L2 4.7L4.6 3.9L4.6 5.8L3.5 6.5L3.5 7L4.9 6.7L5 6.7L6.4 7L6.4 6.5L5.3 5.8L5.3 3.9L7.9 4.7L7.9 4L5.3 2.5L5.3 1.7C5.3 1.3 5 1 4.6 1.7Z", fill: "white", stroke: "rgba(15,23,42,0.4)", strokeWidth: "0.1", transform: "rotate(90 5 4)" }) })] })] })) : null] }), mapPoints] }));
}
export default function RouteMap(_a) {
    var cities = _a.cities, origin = _a.origin, destination = _a.destination, selectedRoute = _a.selectedRoute, _b = _a.className, className = _b === void 0 ? '' : _b, _c = _a.isExpanded, isExpanded = _c === void 0 ? false : _c;
    var path = selectedRoute === null || selectedRoute === void 0 ? void 0 : selectedRoute.path;
    return (_jsx("div", { className: "relative w-full overflow-hidden rounded-3xl bg-slate-950 p-0 shadow-inner ring-1 ring-cyan-500/10 flex items-center justify-center ".concat(isExpanded ? 'h-full aspect-auto' : 'aspect-[2/1] sm:aspect-[2.5/1]', " ").concat(className), children: _jsxs(MapContainer, { center: [20, 0], zoom: 2, zoomControl: isExpanded, dragging: isExpanded, scrollWheelZoom: isExpanded, doubleClickZoom: isExpanded, attributionControl: false, className: "absolute inset-0 w-full h-full z-0", style: { background: '#020617' }, children: [_jsx(TileLayer, { url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" }), _jsx(MapOverlay, { cities: cities, origin: origin, destination: destination, path: path })] }) }));
}
