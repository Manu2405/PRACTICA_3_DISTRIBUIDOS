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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { BRAND, aircrafts, cities, cityTimezones, conflicts, eventLogs, mockPassengers, nodeStatuses, purchaseLocations, generateSeatMatrixForPlane, getPlaneColumns, } from './data';
import { translations } from './i18n';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';
import BrandMark from './components/BrandMark';
import { fetchRutasBackend, fetchAsientos, postOperacion, postVectorClock } from './api';
function App() {
    var _this = this;
    var _a;
    var refundTimers = useRef({});
    var scheduleRefundToFree = function (seatId) {
        if (refundTimers.current[seatId]) {
            window.clearTimeout(refundTimers.current[seatId]);
        }
        refundTimers.current[seatId] = window.setTimeout(function () {
            setLiveSeatState(function (p) {
                var _a;
                return (p[seatId] === 'refund' ? __assign(__assign({}, p), (_a = {}, _a[seatId] = 'free', _a)) : p);
            });
            delete refundTimers.current[seatId];
        }, 5000);
    };
    var _b = useState('customer'), view = _b[0], setView = _b[1];
    var _c = useState('es'), lang = _c[0], setLang = _c[1];
    var _d = useState(1), customerStep = _d[0], setCustomerStep = _d[1];
    var _e = useState(purchaseLocations[0].code), purchaseLocation = _e[0], setPurchaseLocation = _e[1];
    var _f = useState('42152'), passport = _f[0], setPassport = _f[1];
    var _g = useState('Juanito Pérez'), passengerName = _g[0], setPassengerName = _g[1];
    var _h = useState(null), boardingRecord = _h[0], setBoardingRecord = _h[1];
    var _j = useState(function () { return new Set(); }), sessionReservedSeats = _j[0], setSessionReservedSeats = _j[1];
    var _k = useState(0), searchId = _k[0], setSearchId = _k[1];
    var _l = useState('ATL'), origin = _l[0], setOrigin = _l[1];
    var _m = useState('LON'), destination = _m[0], setDestination = _m[1];
    var _o = useState(0), selectedRouteIndex = _o[0], setSelectedRouteIndex = _o[1];
    var _p = useState(null), selectedSeat = _p[0], setSelectedSeat = _p[1];
    var _q = useState({}), liveSeatState = _q[0], setLiveSeatState = _q[1];
    var _r = useState({}), dbSeatIds = _r[0], setDbSeatIds = _r[1];
    var _s = useState(null), feedback = _s[0], setFeedback = _s[1];
    var _t = useState(false), showReserveModal = _t[0], setShowReserveModal = _t[1];
    var _u = useState([]), routeOptions = _u[0], setRouteOptions = _u[1];
    var t = translations[lang];
    useEffect(function () {
        // Poll for seats to keep UI in sync
        var interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var seatObj;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetchAsientos(1)];
                    case 1:
                        seatObj = _a.sent();
                        setLiveSeatState(function (prev) {
                            var next = __assign({}, prev);
                            var newDbIds = {};
                            for (var k in seatObj) {
                                if (k.startsWith('_db_id_')) {
                                    newDbIds[k.replace('_db_id_', '')] = seatObj[k];
                                }
                                else {
                                    next[k] = seatObj[k];
                                }
                            }
                            setDbSeatIds(function (d) { return (__assign(__assign({}, d), newDbIds)); });
                            return next;
                        });
                        return [2 /*return*/];
                }
            });
        }); }, 3000);
        return function () { return clearInterval(interval); };
    }, []);
    useEffect(function () {
        fetchRutasBackend(origin, destination).then(function (data) {
            setRouteOptions(data);
            setSelectedRouteIndex(0);
        });
    }, [origin, destination, searchId]);
    var selectedRoute = (_a = routeOptions[selectedRouteIndex]) !== null && _a !== void 0 ? _a : null;
    var sessionReservedList = useMemo(function () { return __spreadArray([], sessionReservedSeats, true); }, [sessionReservedSeats]);
    var _v = useMemo(function () {
        var _a;
        if (!selectedRoute)
            return { currentSeatMatrix: generateSeatMatrixForPlane(60, 6), firstClassSeats: 12, columns: 6 };
        var planeModel = ((_a = selectedRoute.aircraft) === null || _a === void 0 ? void 0 : _a.split(' / ')[0]) || 'A320';
        var cols = getPlaneColumns(planeModel);
        var ac = aircrafts.find(function (a) { return a.model === planeModel; }) || aircrafts[0];
        return {
            currentSeatMatrix: generateSeatMatrixForPlane(ac.first + ac.economy, cols),
            firstClassSeats: ac.first,
            columns: cols
        };
    }, [selectedRoute]), currentSeatMatrix = _v.currentSeatMatrix, firstClassSeats = _v.firstClassSeats, columns = _v.columns;
    var showFeedback = function (message, variant) {
        setFeedback({ message: message, variant: variant });
        window.setTimeout(function () { return setFeedback(null); }, variant === 'error' ? 5500 : 7500);
    };
    var resetCustomerFlow = function () {
        setCustomerStep(1);
        setBoardingRecord(null);
        setSelectedSeat(null);
        setSelectedRouteIndex(0);
        setFeedback(null);
    };
    var setOriginSafe = function (code) {
        setOrigin(code);
        setSelectedRouteIndex(0);
        setSelectedSeat(null);
        if (customerStep > 1) {
            setCustomerStep(1);
            setBoardingRecord(null);
        }
        if (code === destination) {
            var other = cities.find(function (c) { return c.code !== code; });
            if (other)
                setDestination(other.code);
        }
    };
    var setDestinationSafe = function (code) {
        setDestination(code);
        setSelectedRouteIndex(0);
        setSelectedSeat(null);
        if (customerStep > 1) {
            setCustomerStep(1);
            setBoardingRecord(null);
        }
        if (code === origin) {
            var other = cities.find(function (c) { return c.code !== code; });
            if (other)
                setOrigin(other.code);
        }
    };
    var handleNewSearch = function () {
        setSearchId(function (s) { return s + 1; });
        resetCustomerFlow();
    };
    var handleSubmit = function (action) { return __awaiter(_this, void 0, void 0, function () {
        var seat, dbSeatId, endpoint, res, e_1, now, purchaseLocationLabel, record;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (origin === destination) {
                        showFeedback(lang === 'es' ? 'Elige origen y destino distintos.' : 'Choose different origin and destination.', 'error');
                        return [2 /*return*/];
                    }
                    if (!selectedRoute) {
                        showFeedback(lang === 'es' ? 'No hay ruta disponible.' : 'No route available.', 'error');
                        return [2 /*return*/];
                    }
                    if (!selectedSeat) {
                        showFeedback(lang === 'es' ? 'Selecciona un asiento libre o tu reserva.' : 'Select a free seat or your reservation.', 'error');
                        return [2 /*return*/];
                    }
                    if (!passport.trim() || !passengerName.trim()) {
                        showFeedback(lang === 'es' ? 'Completa pasaporte y nombre.' : 'Complete passport and name.', 'error');
                        return [2 /*return*/];
                    }
                    seat = selectedSeat;
                    dbSeatId = dbSeatIds[seat] || 1;
                    endpoint = action === 'reserva' ? 'reservas' : 'ventas';
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, postVectorClock('NODO_MANU')];
                case 2:
                    _f.sent(); // Simulate Vector Clock tick
                    return [4 /*yield*/, postOperacion(endpoint, {
                            asientoId: dbSeatId,
                            pasajeroId: 1, // Mock Passenger DB ID
                            nodoOrigen: 'NODO_MANU'
                        })];
                case 3:
                    res = _f.sent();
                    if (!res.ok) {
                        showFeedback('Error del servidor: ' + (res.message || 'Conflicto.'), 'error');
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _f.sent();
                    showFeedback('Fallo de conexión.', 'error');
                    return [2 /*return*/];
                case 5:
                    now = new Date();
                    if (action === 'reserva') {
                        setShowReserveModal(true);
                        setSessionReservedSeats(function (prev) { return new Set(prev).add(seat); });
                        setLiveSeatState(function (prev) {
                            var _a;
                            return (__assign(__assign({}, prev), (_a = {}, _a[seat] = 'reserved', _a)));
                        });
                        return [2 /*return*/];
                    }
                    setLiveSeatState(function (prev) {
                        var _a;
                        return (__assign(__assign({}, prev), (_a = {}, _a[seat] = 'sold', _a)));
                    });
                    setSessionReservedSeats(function (prev) {
                        var next = new Set(prev);
                        next.delete(seat);
                        return next;
                    });
                    purchaseLocationLabel = (_a = purchaseLocations.find(function (p) { return p.code === purchaseLocation; })) === null || _a === void 0 ? void 0 : _a.label;
                    record = {
                        kind: action === 'compra' ? 'compra' : 'reserva',
                        passengerName: passengerName.trim(),
                        passport: passport.trim(),
                        seat: seat,
                        flight: selectedRoute.flightCodes || 'LB-1337',
                        origin: origin,
                        destination: destination,
                        originLabel: (_c = (_b = cities.find(function (c) { return c.code === origin; })) === null || _b === void 0 ? void 0 : _b.label) !== null && _c !== void 0 ? _c : origin,
                        destinationLabel: (_e = (_d = cities.find(function (c) { return c.code === destination; })) === null || _d === void 0 ? void 0 : _d.label) !== null && _e !== void 0 ? _e : destination,
                        departure: selectedRoute.departureLocal,
                        arrival: selectedRoute.arrivalLocal,
                        gate: selectedRoute.gate,
                        travelClass: action === 'compra' ? 'Y' : 'R',
                        localIssuedAt: now.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { dateStyle: 'medium', timeStyle: 'medium' }),
                        flightDate: now.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
                        issuedAtISO: now.toISOString(),
                        purchaseLocationLabel: purchaseLocationLabel,
                    };
                    setBoardingRecord(record);
                    setSelectedSeat(null);
                    setFeedback(null);
                    setCustomerStep(5);
                    return [2 /*return*/];
            }
        });
    }); };
    var handleCancelReservation = function () { return __awaiter(_this, void 0, void 0, function () {
        var seat, dbSeatId, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!selectedSeat)
                        return [2 /*return*/];
                    if (!sessionReservedSeats.has(selectedSeat))
                        return [2 /*return*/];
                    seat = selectedSeat;
                    dbSeatId = dbSeatIds[seat] || 1;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, postVectorClock('NODO_MANU')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, postOperacion('anulaciones', {
                            asientoId: dbSeatId,
                            pasajeroId: 1,
                            motivo: 'CANCEL_BY_USER',
                            tipo: 'RESERVA',
                            nodoOrigen: 'NODO_MANU'
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_2 = _a.sent();
                    console.error(e_2);
                    return [3 /*break*/, 5];
                case 5:
                    setLiveSeatState(function (prev) {
                        var _a;
                        return (__assign(__assign({}, prev), (_a = {}, _a[seat] = 'refund', _a)));
                    });
                    setSessionReservedSeats(function (prev) {
                        var next = new Set(prev);
                        next.delete(seat);
                        return next;
                    });
                    scheduleRefundToFree(seat);
                    setSelectedSeat(null);
                    showFeedback(lang === 'es' ? 'Reserva anulada' : 'Reservation cancelled', 'success');
                    return [2 /*return*/];
            }
        });
    }); };
    var handleCancelPurchase = function (seatId) { return __awaiter(_this, void 0, void 0, function () {
        var dbSeatId, e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dbSeatId = dbSeatIds[seatId] || 1;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, postVectorClock('NODO_MANU')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, postOperacion('anulaciones', {
                            asientoId: dbSeatId,
                            pasajeroId: 1,
                            motivo: 'CANCEL_BY_USER',
                            tipo: 'VENTA',
                            nodoOrigen: 'NODO_MANU'
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_3 = _a.sent();
                    console.error(e_3);
                    return [3 /*break*/, 5];
                case 5:
                    setLiveSeatState(function (prev) {
                        var _a;
                        return (__assign(__assign({}, prev), (_a = {}, _a[seatId] = 'refund', _a)));
                    });
                    setBoardingRecord(null);
                    setCustomerStep(1);
                    scheduleRefundToFree(seatId);
                    showFeedback(lang === 'es' ? 'Compra anulada. Sincronizando...' : 'Purchase cancelled. Syncing...', 'success');
                    return [2 /*return*/];
            }
        });
    }); };
    return (_jsxs("div", { className: "app-shell", children: [_jsx("div", { className: "app-shell-inner min-h-screen px-4 py-8 text-slate-100 sm:px-6", children: _jsxs("div", { className: "mx-auto max-w-7xl space-y-8", children: [_jsxs("header", { className: "flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between", children: [_jsx(BrandMark, { name: t.brand_name, tagline: t.brand_tagline, shortName: BRAND.shortName, iconSrc: BRAND.iconImage }), _jsx("div", { className: "flex flex-wrap items-center gap-4", children: _jsxs("div", { className: "inline-flex rounded-3xl border border-white/10 bg-slate-900/80 p-1.5 shadow-xl backdrop-blur-md", children: [_jsx("button", { type: "button", onClick: function () { return setView('customer'); }, className: "rounded-2xl px-6 py-3 text-sm font-bold transition-all ".concat(view === 'customer'
                                                    ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                                                    : 'text-slate-400 hover:text-white'), children: t.customer }), _jsx("button", { type: "button", onClick: function () { return setView('admin'); }, className: "rounded-2xl px-6 py-3 text-sm font-bold transition-all ".concat(view === 'admin'
                                                    ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                                                    : 'text-slate-400 hover:text-white'), children: t.admin })] }) })] }), view === 'customer' ? (_jsx(CustomerView, { lang: lang, brand: BRAND, cities: cities, purchaseLocations: purchaseLocations, cityTimezones: cityTimezones, mockPassengers: mockPassengers, step: customerStep, setStep: setCustomerStep, purchaseLocation: purchaseLocation, setPurchaseLocation: setPurchaseLocation, origin: origin, destination: destination, setOrigin: setOriginSafe, setDestination: setDestinationSafe, routeOptions: routeOptions, selectedRouteIndex: selectedRouteIndex, setSelectedRouteIndex: setSelectedRouteIndex, selectedRoute: selectedRoute, seatMatrix: currentSeatMatrix, firstClassSeats: firstClassSeats, seatState: liveSeatState, selectedSeat: selectedSeat, setSelectedSeat: setSelectedSeat, passport: passport, setPassport: setPassport, passengerName: passengerName, setPassengerName: setPassengerName, sessionReservedSeats: sessionReservedList, onCancelReservation: handleCancelReservation, onCancelPurchase: handleCancelPurchase, onSubmit: handleSubmit, feedback: feedback, boardingRecord: boardingRecord, onNewSearch: handleNewSearch, columns: columns })) : (_jsx(AdminView, { lang: lang, nodeStatuses: nodeStatuses, conflicts: conflicts, eventLogs: eventLogs, aircrafts: aircrafts, brandShort: BRAND.shortName, brandName: t.brand_name }))] }) }), showReserveModal && (_jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm", children: _jsxs("div", { className: "w-full max-w-sm rounded-3xl bg-slate-900 border p-8 text-center text-white", children: [_jsx("h3", { className: "text-2xl font-bold mb-2", children: "\u00A1Reservado!" }), _jsx("p", { className: "text-slate-400 mb-8", children: "Por favor realiza la compra." }), _jsx("button", { onClick: function () { return setShowReserveModal(false); }, className: "w-full bg-cyan-500 py-3 rounded-xl text-black", children: "Continuar" })] }) }))] }));
}
export default App;
