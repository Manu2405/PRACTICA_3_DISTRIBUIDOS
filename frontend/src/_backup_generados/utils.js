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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { routeMatrix, aircrafts } from './data';
var ROUTE_HUBS = ['LON', 'ATL', 'FRA', 'DXB', 'SIN', 'MAD', 'AMS', 'IST', 'PEK', 'CAN'];
function shuffle(array) {
    var _a;
    var result = __spreadArray([], array, true);
    for (var i = result.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [result[j], result[i]], result[i] = _a[0], result[j] = _a[1];
    }
    return result;
}
function getUniquePlaneFromPool(pool) {
    if (pool.length === 0)
        return 'Airbus A320neo';
    return pool.pop() || 'Airbus A320neo';
}
/** Solo para mapa (paso 1): línea directa origen→destino con avión animado. */
export function syntheticPreviewRoute(origin, destination) {
    return {
        path: [origin, destination],
        type: 'Directa',
        economy: 0,
        first: 0,
        time: 0,
        flight: '—',
        airline: 'SARP',
        plane: '—',
        gate: '—',
        departure: '—',
        arrival: '—',
    };
}
function mergeHubLegs(origin, hub, destination, leg1, leg2, pool) {
    var p1 = getUniquePlaneFromPool(pool);
    var p2 = getUniquePlaneFromPool(pool);
    return {
        path: [origin, hub, destination],
        type: 'Escala',
        economy: leg1.economy + leg2.economy,
        first: leg1.first + leg2.first,
        time: leg1.time + leg2.time + 1,
        flight: "".concat(leg1.flight, " + ").concat(leg2.flight),
        airline: "".concat(leg1.airline, " / ").concat(leg2.airline),
        plane: "".concat(p1, " / ").concat(p2),
        gate: "".concat(leg1.gate, " / ").concat(leg2.gate),
        departure: leg1.departure,
        arrival: leg2.arrival,
    };
}
function syntheticFallbackRoute(origin, destination, pool) {
    var _a, _b;
    var seed = ((_a = origin.codePointAt(0)) !== null && _a !== void 0 ? _a : 0) + ((_b = destination.codePointAt(0)) !== null && _b !== void 0 ? _b : 0);
    var depH = 8 + (seed % 5);
    var depM = (seed % 4) * 15;
    var arrH = 15 + (seed % 6);
    var arrM = (seed % 4) * 15;
    return {
        path: [origin, destination],
        type: 'Directa',
        economy: 380 + (seed % 420),
        first: 720 + (seed % 300),
        time: 5 + (seed % 6),
        flight: "SARP-".concat(origin).concat(destination),
        airline: 'Sistema Aerolíneas Rafael Pabón',
        plane: getUniquePlaneFromPool(pool),
        gate: "G".concat((seed % 9) + 1),
        departure: "".concat(String(depH).padStart(2, '0'), ":").concat(String(depM).padStart(2, '0')),
        arrival: "".concat(String(arrH).padStart(2, '0'), ":").concat(String(arrM).padStart(2, '0')),
    };
}
export function computeRoutes(origin, destination) {
    var _a, _b, _c, _d;
    if (origin === destination)
        return [];
    var options = [];
    var planePool = shuffle(aircrafts.map(function (a) { return a.model; }));
    var direct = (_a = routeMatrix[origin]) === null || _a === void 0 ? void 0 : _a[destination];
    if (direct)
        options.push(__assign(__assign({}, direct), { plane: getUniquePlaneFromPool(planePool) }));
    var originRoutes = (_b = routeMatrix[origin]) !== null && _b !== void 0 ? _b : {};
    Object.keys(originRoutes).forEach(function (stop) {
        var _a;
        if (stop === destination)
            return;
        var firstLeg = originRoutes[stop];
        var secondLeg = (_a = routeMatrix[stop]) === null || _a === void 0 ? void 0 : _a[destination];
        if (firstLeg && secondLeg) {
            options.push({
                path: [origin, stop, destination],
                type: 'Escala',
                economy: firstLeg.economy + secondLeg.economy,
                first: firstLeg.first + secondLeg.first,
                time: firstLeg.time + secondLeg.time + 1,
                flight: "".concat(firstLeg.flight, " + ").concat(secondLeg.flight),
                airline: "".concat(firstLeg.airline, " / ").concat(secondLeg.airline),
                plane: "".concat(getUniquePlaneFromPool(planePool), " / ").concat(getUniquePlaneFromPool(planePool)),
                gate: "".concat(firstLeg.gate, " / ").concat(secondLeg.gate),
                departure: firstLeg.departure,
                arrival: secondLeg.arrival,
            });
        }
    });
    if (options.length === 0) {
        for (var _i = 0, ROUTE_HUBS_1 = ROUTE_HUBS; _i < ROUTE_HUBS_1.length; _i++) {
            var hub = ROUTE_HUBS_1[_i];
            if (hub === origin || hub === destination)
                continue;
            var leg1 = (_c = routeMatrix[origin]) === null || _c === void 0 ? void 0 : _c[hub];
            var leg2 = (_d = routeMatrix[hub]) === null || _d === void 0 ? void 0 : _d[destination];
            if (leg1 && leg2) {
                options.push(mergeHubLegs(origin, hub, destination, leg1, leg2, planePool));
            }
        }
    }
    if (options.length === 0) {
        options.push(syntheticFallbackRoute(origin, destination, planePool));
    }
    // Generar datos adicionales ("inserta varios datos para que pueda elegir")
    if (options.length < 5) {
        var base = syntheticFallbackRoute(origin, destination, planePool);
        options.push(__assign(__assign({}, base), { type: 'Directa', economy: Math.max(150, base.economy - 95), time: base.time + 1, plane: getUniquePlaneFromPool(planePool), flight: "SARP-PROM-".concat(origin).concat(destination) }));
        options.push(__assign(__assign({}, base), { type: 'Escala', economy: base.economy - 140, first: base.first - 50, time: base.time + 5, plane: getUniquePlaneFromPool(planePool), path: [origin, ROUTE_HUBS[Math.floor(Math.random() * ROUTE_HUBS.length)], destination], flight: "SARP-ESC1" }));
        options.push(__assign(__assign({}, base), { type: 'Directa', economy: base.economy + 160, time: Math.max(1, base.time - 2), plane: getUniquePlaneFromPool(planePool), flight: "SARP-FAST-".concat(origin).concat(destination) }));
    }
    return options.sort(function (a, b) { return a.economy - b.economy; });
}
export function statusBadgeClass(status) {
    if (status === 'Sincronizado')
        return 'bg-emerald-500';
    if (status === 'Parcial')
        return 'bg-amber-500';
    return 'bg-sky-500';
}
export function canReserve(state) {
    return (state !== null && state !== void 0 ? state : 'free') === 'free';
}
export function canPurchase(state) {
    var s = state !== null && state !== void 0 ? state : 'free';
    return s === 'free' || s === 'reserved';
}
export function isSeatSelectable(state) {
    return canReserve(state);
}
export function formatTimeInTz(date, timeZone) {
    if (!timeZone) {
        return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    }
    return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short', timeZone: timeZone });
}
export function canRefundFromSale() {
    return false;
}
