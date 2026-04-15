import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { canPurchase, canReserve, formatTimeInTz, syntheticPreviewRoute } from '../utils';
import { downloadWalletDemoJson } from '../googleWalletMock';
import { translations, getStatusLabel } from '../i18n';
import RouteMap from './RouteMap';
import SeatMap, { SeatStateLegend } from './SeatMap';
import BoardingPassCard from './BoardingPassCard';
import FlightLoadingOverlay from './FlightLoadingOverlay';
import { aircrafts } from '../data';
function runStepTransition(lockRef, setBusy, message, ms, go) {
    if (lockRef.current)
        return;
    lockRef.current = true;
    setBusy({ show: true, msg: message });
    window.setTimeout(function () {
        setBusy({ show: false, msg: '' });
        lockRef.current = false;
        go();
    }, ms);
}
function AnimatedStepper(_a) {
    var step = _a.step, lang = _a.lang;
    var t = translations[lang];
    var labels = {
        1: t.step_1,
        2: t.step_2,
        3: t.step_3,
        4: t.step_4,
        5: t.step_5,
    };
    var steps = [1, 2, 3, 4, 5];
    return (_jsx("nav", { className: "flex flex-wrap items-end justify-center gap-0.5 sm:gap-2", "aria-label": "Progreso", children: steps.map(function (n, i) { return (_jsxs("div", { className: "flex items-end", children: [_jsxs("div", { className: "flex flex-col items-center gap-1.5 px-0.5 sm:px-2", children: [_jsxs("div", { className: "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition-all duration-500 ".concat(step === n
                                ? 'scale-110 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/40 ring-2 ring-white/40'
                                : step > n
                                    ? 'bg-teal-600/40 text-teal-100 ring-1 ring-teal-400/50'
                                    : 'bg-slate-800/90 text-slate-500 ring-1 ring-white/10'), children: [n, step === n ? (_jsx("span", { className: "pointer-events-none absolute -inset-1 rounded-full border border-cyan-200/50 animate-ping opacity-25" })) : null] }), _jsx("span", { className: "max-w-[4.75rem] text-center text-[9px] font-bold uppercase leading-tight tracking-wide sm:max-w-[5.5rem] sm:text-[10px] ".concat(step === n ? 'text-cyan-300' : step > n ? 'text-teal-400/90' : 'text-slate-500'), children: labels[n] })] }), i < steps.length - 1 ? (_jsx("span", { className: "sarp-step-plane mb-7 self-end px-0.5 text-sm text-cyan-200/80 sm:mb-8 sm:px-1 sm:text-base", "aria-hidden": true, children: "\u2708" })) : null] }, n)); }) }));
}
export default function CustomerView(props) {
    var _a, _b;
    var lang = props.lang, brand = props.brand, cities = props.cities, purchaseLocations = props.purchaseLocations, cityTimezones = props.cityTimezones, mockPassengers = props.mockPassengers, step = props.step, setStep = props.setStep, purchaseLocation = props.purchaseLocation, setPurchaseLocation = props.setPurchaseLocation, origin = props.origin, destination = props.destination, setOrigin = props.setOrigin, setDestination = props.setDestination, routeOptions = props.routeOptions, selectedRouteIndex = props.selectedRouteIndex, setSelectedRouteIndex = props.setSelectedRouteIndex, selectedRoute = props.selectedRoute, seatMatrix = props.seatMatrix, firstClassSeats = props.firstClassSeats, seatState = props.seatState, selectedSeat = props.selectedSeat, setSelectedSeat = props.setSelectedSeat, passport = props.passport, setPassport = props.setPassport, passengerName = props.passengerName, setPassengerName = props.setPassengerName, sessionReservedSeats = props.sessionReservedSeats, onCancelReservation = props.onCancelReservation, onCancelPurchase = props.onCancelPurchase, onSubmit = props.onSubmit, feedback = props.feedback, boardingRecord = props.boardingRecord, onNewSearch = props.onNewSearch, columns = props.columns;
    var t = translations[lang];
    var _c = useState(new Date()), now = _c[0], setNow = _c[1];
    useEffect(function () {
        var timer = setInterval(function () { return setNow(new Date()); }, 1000);
        return function () { return clearInterval(timer); };
    }, []);
    var originCities = cities.filter(function (c) { return c.code !== destination; });
    var destCities = cities.filter(function (c) { return c.code !== origin; });
    var oCity = cities.find(function (c) { return c.code === origin; });
    var dCity = cities.find(function (c) { return c.code === destination; });
    var tzO = oCity ? cityTimezones[oCity.code] : undefined;
    var tzD = dCity ? cityTimezones[dCity.code] : undefined;
    var seatSt = selectedSeat ? seatState[selectedSeat] : undefined;
    var reserveEnabled = step >= 4 && Boolean(selectedSeat) && canReserve(seatSt);
    var purchaseEnabled = step >= 4 && Boolean(selectedSeat) && canPurchase(seatSt);
    var canCancelSession = selectedSeat != null &&
        sessionReservedSeats.includes(selectedSeat) &&
        seatSt === 'reserved';
    var applyPassportLookup = function (value) {
        setPassport(value);
        var hit = mockPassengers[value.trim()];
        if (hit)
            setPassengerName(hit);
    };
    var _d = useState({ show: false, msg: '' }), stepBusy = _d[0], setStepBusy = _d[1];
    var _e = useState(false), isMapExpanded = _e[0], setIsMapExpanded = _e[1];
    var _f = useState(false), isWalletModalOpen = _f[0], setIsWalletModalOpen = _f[1];
    var _g = useState(false), isScanningWallet = _g[0], setIsScanningWallet = _g[1];
    var transitionLock = useRef(false);
    var _h = useState(null), cancelWindowSeconds = _h[0], setCancelWindowSeconds = _h[1];
    // Cancellation window logic
    useEffect(function () {
        if (step === 5 && (boardingRecord === null || boardingRecord === void 0 ? void 0 : boardingRecord.issuedAtISO) && boardingRecord.kind === 'compra') {
            var issuedAt_1 = new Date(boardingRecord.issuedAtISO).getTime();
            var updateSeconds = function () {
                var diff = (issuedAt_1 + 300000 - Date.now()) / 1000;
                if (diff <= 0) {
                    setCancelWindowSeconds(null);
                }
                else {
                    setCancelWindowSeconds(Math.floor(diff));
                }
            };
            updateSeconds();
            var timer_1 = setInterval(updateSeconds, 1000);
            return function () { return clearInterval(timer_1); };
        }
        else {
            setCancelWindowSeconds(null);
        }
    }, [step, boardingRecord]);
    var handleWalletScan = function () {
        if (isScanningWallet)
            return;
        setIsScanningWallet(true);
        setTimeout(function () {
            setIsScanningWallet(false);
            setIsWalletModalOpen(true);
        }, 1500);
    };
    var scannerBuffer = useRef('');
    var scannerTimeout = useRef(null);
    useEffect(function () {
        var t;
        if (isWalletModalOpen) {
            t = window.setTimeout(function () {
                setIsWalletModalOpen(false);
                onNewSearch();
            }, 4500);
        }
        return function () { return window.clearTimeout(t); };
    }, [isWalletModalOpen, onNewSearch]);
    useEffect(function () {
        if (step !== 5 || !boardingRecord)
            return;
        var handleKeyDown = function (e) {
            if (e.ctrlKey || e.altKey || e.metaKey)
                return;
            if (e.key === 'Enter') {
                var buffer = scannerBuffer.current.trim();
                if (buffer.includes(boardingRecord.passport) || buffer.includes('SARP_BOARDING_PASS')) {
                    e.preventDefault();
                    handleWalletScan();
                }
                scannerBuffer.current = '';
                return;
            }
            if (e.key.length === 1) {
                scannerBuffer.current += e.key;
            }
            if (scannerTimeout.current)
                window.clearTimeout(scannerTimeout.current);
            scannerTimeout.current = window.setTimeout(function () {
                scannerBuffer.current = '';
            }, 120);
        };
        window.addEventListener('keydown', handleKeyDown);
        return function () {
            window.removeEventListener('keydown', handleKeyDown);
            if (scannerTimeout.current)
                window.clearTimeout(scannerTimeout.current);
        };
    }, [step, isScanningWallet, boardingRecord]);
    var sortedRoutes = useMemo(function () {
        return routeOptions.map(function (offer, originalIndex) { return ({ offer: offer, originalIndex: originalIndex }); });
    }, [routeOptions]);
    var _j = useMemo(function () {
        if (routeOptions.length === 0)
            return { minEconomy: 0, minTime: 0 };
        return {
            minEconomy: Math.min.apply(Math, routeOptions.map(function (o) { return o.economy; })),
            minTime: Math.min.apply(Math, routeOptions.map(function (o) { return o.time; }))
        };
    }, [routeOptions]), minEconomy = _j.minEconomy, minTime = _j.minTime;
    var mapDisplayRoute = useMemo(function () {
        if (step === 1)
            return syntheticPreviewRoute(origin, destination);
        if (selectedRoute)
            return selectedRoute;
        return syntheticPreviewRoute(origin, destination);
    }, [step, selectedRoute, origin, destination]);
    return (_jsxs("div", { className: "space-y-6 animate-fade-in-up", children: [stepBusy.show ? _jsx(FlightLoadingOverlay, { message: stepBusy.msg }) : null, _jsx("div", { className: "flex flex-col items-center gap-4 rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl ring-1 ring-teal-500/10 sm:flex-row sm:justify-center", children: _jsx(AnimatedStepper, { step: step, lang: lang }) }), step === 1 && (_jsxs("section", { className: "grid gap-6 lg:grid-cols-[1fr_minmax(0,520px)]", children: [_jsxs("div", { className: "rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl", children: [_jsxs("h2", { className: "text-xl font-bold text-white", children: ["1. ", t.origin, ", ", t.destination] }), _jsxs("label", { className: "mt-6 block text-sm font-medium text-slate-300", children: [t.buy_from, _jsxs("div", { className: "relative mt-2", children: [_jsx("select", { className: "w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30", value: purchaseLocation, onChange: function (e) { return setPurchaseLocation(e.target.value); }, children: purchaseLocations.map(function (p) { return (_jsx("option", { value: p.code, children: p.label }, p.code)); }) }), _jsxs("div", { className: "mt-3 flex items-center justify-between rounded-xl bg-slate-800/40 p-3 ring-1 ring-white/5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1", children: t.local_time_point }), _jsx("p", { className: "text-sm font-bold text-slate-200", children: formatTimeInTz(now, cityTimezones[purchaseLocation]) })] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1", children: t.timezone_label }), _jsx("p", { className: "text-[10px] font-mono text-cyan-400/80", children: cityTimezones[purchaseLocation] || 'UTC' })] })] })] })] }), _jsxs("div", { className: "mt-4 grid gap-4 sm:grid-cols-2", children: [_jsxs("label", { className: "block text-sm font-medium text-slate-300", children: [t.origin, _jsx("select", { className: "mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500", value: origin, onChange: function (e) { return setOrigin(e.target.value); }, children: originCities.map(function (city) { return (_jsxs("option", { value: city.code, children: [city.label, " (", city.country, ")"] }, city.code)); }) })] }), _jsxs("label", { className: "block text-sm font-medium text-slate-300", children: [t.destination, _jsx("select", { className: "mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500", value: destination, onChange: function (e) { return setDestination(e.target.value); }, children: destCities.map(function (city) { return (_jsxs("option", { value: city.code, children: [city.label, " (", city.country, ")"] }, city.code)); }) })] })] }), _jsx("div", { className: "mt-6 flex flex-wrap gap-3", children: _jsx("button", { type: "button", onClick: function () {
                                        return runStepTransition(transitionLock, setStepBusy, t.step_1 + '...', 780, function () {
                                            onNewSearch();
                                            setStep(2);
                                        });
                                    }, className: "rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98]", children: t.search_routes }) })] }), _jsxs("div", { className: "rounded-3xl border border-white/10 bg-slate-900/50 p-4 ring-1 ring-cyan-500/10 transition-all duration-500 ".concat(isMapExpanded ? 'lg:col-span-2 fixed inset-4 z-[150] bg-slate-950/95 backdrop-blur-xl flex flex-col' : 'relative'), children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("p", { className: "text-sm font-semibold text-slate-300", children: t.live_map }), _jsx("button", { onClick: function () { return setIsMapExpanded(!isMapExpanded); }, className: "rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors", title: isMapExpanded ? 'Close' : 'Expand', children: isMapExpanded ? (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5" }) })) : (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "m15 3 6 6-6 6M9 21l-6-6 6-6" }) })) })] }), _jsx("div", { className: "mt-0 flex-grow ".concat(isMapExpanded ? 'h-full' : 'h-72'), children: _jsx(RouteMap, { cities: cities, origin: origin, destination: destination, selectedRoute: mapDisplayRoute, isExpanded: isMapExpanded, className: "w-full h-full" }) })] })] })), step === 2 && (_jsxs("section", { className: "grid gap-6 xl:grid-cols-[1.15fr_0.85fr]", children: [_jsxs("div", { className: "rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl", children: [_jsxs("h2", { className: "text-xl font-bold text-white", children: ["2. ", t.suggested_routes] }), _jsx("div", { className: "mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-700/50 pb-6 mb-6", children: sortedRoutes.filter(function (_a) {
                                    var offer = _a.offer;
                                    return offer.economy === minEconomy || offer.time === minTime;
                                }).map(function (_a) {
                                    var option = _a.offer, originalIndex = _a.originalIndex;
                                    var isCheapest = option.economy === minEconomy;
                                    var isFastest = option.time === minTime;
                                    return (_jsxs("button", { type: "button", onClick: function () {
                                            setSelectedRouteIndex(originalIndex);
                                            setStepBusy({ show: true, msg: t.step_2 + '...' });
                                            transitionLock.current = true;
                                            window.setTimeout(function () {
                                                setStepBusy({ show: false, msg: '' });
                                                setStep(3);
                                                transitionLock.current = false;
                                            }, 1800);
                                        }, className: "group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-slate-800/80 p-5 text-left shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-slate-800 hover:shadow-emerald-500/20", children: [_jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [_jsx("span", { className: "rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300", children: option.type }), _jsx("span", { className: "text-[9px] font-black text-emerald-300 uppercase tracking-[0.15em] bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm", children: isCheapest && isFastest ? t.cheapest_fastest : isCheapest ? t.best_cost : t.best_time })] }), _jsxs("div", { className: "flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/5 border border-cyan-500/10", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" }), _jsx("span", { className: "text-[9px] font-black text-cyan-400 uppercase tracking-widest", children: getStatusLabel(option.status, lang) })] })] }), _jsx("p", { className: "mt-3 font-bold text-white text-lg", children: option.path.join(' → ') }), _jsxs("div", { className: "mt-2 flex flex-col gap-1 text-sm text-slate-300", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "font-medium text-slate-400", children: [t.flight_code, ":"] }), _jsx("span", { children: option.flight })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "font-medium text-slate-400", children: [t.aircraft, ":"] }), _jsx("span", { className: "text-cyan-200/70", children: option.plane })] }), _jsx("div", { className: "flex items-center gap-2 mt-2", children: _jsxs("span", { className: "flex items-center gap-1.5 font-medium", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-sky-400", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] }), option.time, "h ", t.travel_time] }) })] })] }), _jsxs("div", { className: "mt-4 flex items-baseline justify-between rounded-xl bg-slate-900/50 p-3 ring-1 ring-white/5", children: [_jsxs("div", { className: "text-left", children: [_jsx("span", { className: "text-[10px] uppercase text-slate-400", children: t.economy }), _jsxs("div", { className: "text-xl font-bold text-emerald-400", children: ["$", option.economy] })] }), _jsxs("div", { className: "text-right opacity-80", children: [_jsx("span", { className: "text-[10px] uppercase text-slate-500", children: t.first_class }), _jsxs("div", { className: "text-lg font-bold text-slate-300", children: ["$", option.first] })] })] })] }, "featured-".concat(option.path.join('-'), "-").concat(originalIndex)));
                                }) }), _jsx("h3", { className: "text-md font-bold text-slate-300 mb-4", children: t.other_options }), _jsx("div", { className: "space-y-4", children: routeOptions.length > 0 ? (sortedRoutes.filter(function (_a) {
                                    var offer = _a.offer;
                                    return offer.economy !== minEconomy && offer.time !== minTime;
                                }).map(function (_a) {
                                    var option = _a.offer, originalIndex = _a.originalIndex;
                                    return (_jsxs("button", { type: "button", onClick: function () {
                                            setSelectedRouteIndex(originalIndex);
                                            setSelectedSeat(null);
                                        }, className: "w-full rounded-3xl border px-4 py-4 text-left transition-all duration-200 active:scale-[0.99] ".concat(selectedRouteIndex === originalIndex
                                            ? 'border-cyan-400 bg-cyan-500/15 shadow-lg shadow-cyan-500/15'
                                            : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'), children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300", children: option.type }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-cyan-400 opacity-50" }), _jsx("span", { className: "text-[10px] font-bold text-cyan-400 uppercase tracking-tight", children: getStatusLabel(option.status, lang) })] })] }), _jsx("p", { className: "mt-3 font-semibold text-white text-lg", children: option.path.join(' → ') }), _jsx("p", { className: "text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-1", children: option.plane }), _jsxs("div", { className: "mt-4 flex items-baseline justify-between rounded-xl bg-slate-900/50 p-3 ring-1 ring-white/5", children: [_jsxs("div", { className: "text-left", children: [_jsx("span", { className: "text-[10px] uppercase text-slate-400", children: t.economy }), _jsxs("div", { className: "text-lg font-bold text-emerald-400", children: ["$", option.economy] })] }), _jsx("div", { className: "text-right", children: _jsxs("span", { className: "flex items-center gap-1.5 text-xs text-slate-400", children: [option.time, "h"] }) })] })] }, "".concat(option.path.join('-'), "-").concat(originalIndex)));
                                })) : (_jsx("div", { className: "rounded-3xl bg-slate-800 p-8 text-slate-400", children: "No hay rutas." })) }), _jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [_jsx("button", { type: "button", onClick: function () { return setStep(1); }, className: "rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700", children: t.back }), _jsx("button", { type: "button", disabled: !routeOptions.length, onClick: function () {
                                            return runStepTransition(transitionLock, setStepBusy, t.step_2 + '...', 600, function () { return setStep(3); });
                                        }, className: "rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40", children: t.continue_flight })] })] }), _jsx("div", { children: _jsxs("div", { className: "relative group rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-lg", children: [_jsx("div", { className: "absolute top-4 right-4 z-50", children: _jsx("button", { onClick: function () { return setIsMapExpanded(true); }, className: "bg-slate-900/90 text-xs font-bold text-white px-3 py-2 rounded-xl ring-1 ring-white/20 shadow-xl transition duration-300 hover:bg-slate-800 flex items-center gap-2", children: t.expand_map }) }), _jsx(RouteMap, { cities: cities, origin: origin, destination: destination, selectedRoute: mapDisplayRoute, isExpanded: isMapExpanded, onToggleExpand: function () { return setIsMapExpanded(!isMapExpanded); } })] }) })] })), step === 3 && selectedRoute && (_jsxs("section", { className: "grid gap-6 lg:grid-cols-[1fr_380px]", children: [_jsxs("div", { className: "rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl", children: [_jsxs("h2", { className: "text-xl font-bold text-white", children: ["3. ", t.selected_flight] }), _jsxs("div", { className: "mt-4 flex items-center gap-3 mb-4", children: [_jsxs("span", { className: "flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-cyan-400 animate-pulse" }), getStatusLabel(selectedRoute.status, lang)] }), _jsx("span", { className: "text-xs font-bold text-slate-500 uppercase tracking-tighter", children: selectedRoute.type })] }), _jsxs("div", { className: "mt-6 grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl bg-slate-800/80 p-4 ring-1 ring-white/5", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-slate-500", children: t.departure }), _jsx("p", { className: "mt-1 text-2xl font-bold tabular-nums text-white", children: selectedRoute.departure }), _jsx("p", { className: "text-sm text-slate-400", children: oCity === null || oCity === void 0 ? void 0 : oCity.label })] }), _jsxs("div", { className: "rounded-2xl bg-slate-800/80 p-4 ring-1 ring-white/5", children: [_jsx("p", { className: "text-xs uppercase tracking-wider text-slate-500", children: t.arrival }), _jsx("p", { className: "mt-1 text-2xl font-bold tabular-nums text-white", children: selectedRoute.arrival }), _jsx("p", { className: "text-sm text-slate-400", children: dCity === null || dCity === void 0 ? void 0 : dCity.label })] })] }), _jsxs("div", { className: "mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5", children: [_jsx("p", { className: "text-sm text-cyan-200/90", children: t.flight_code }), _jsx("p", { className: "mt-1 text-3xl font-bold text-white", children: selectedRoute.flight }), _jsx("p", { className: "mt-2 text-sm text-slate-400", children: selectedRoute.airline }), _jsxs("p", { className: "mt-3 text-sm text-slate-400", children: [t.gate, ": ", _jsx("span", { className: "font-mono text-slate-200", children: selectedRoute.gate })] }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-6 text-sm", children: [_jsxs("span", { children: [t.economy, ": ", _jsxs("strong", { className: "text-emerald-300", children: ["$", selectedRoute.economy] })] }), _jsxs("span", { children: [t.first_class, ": ", _jsxs("strong", { className: "text-cyan-200", children: ["$", selectedRoute.first] })] }), _jsxs("span", { children: [t.duration, ": ", _jsxs("strong", { className: "text-white", children: [selectedRoute.time, " h"] })] })] }), _jsxs("div", { className: "mt-6 pt-5 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-slate-500 uppercase font-black tracking-widest", children: t.aircraft }), _jsx("p", { className: "text-sm font-bold text-slate-200", children: selectedRoute.plane })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-slate-500 uppercase font-black tracking-widest", children: t.manufacturer }), _jsx("p", { className: "text-sm font-bold text-slate-200", children: ((_a = aircrafts.find(function (a) { return a.model === selectedRoute.plane; })) === null || _a === void 0 ? void 0 : _a.manufacturer) || 'Airbus' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] text-slate-500 uppercase font-black tracking-widest", children: t.weight }), _jsx("p", { className: "text-sm font-bold text-emerald-400 font-mono", children: ((_b = aircrafts.find(function (a) { return a.model === selectedRoute.plane; })) === null || _b === void 0 ? void 0 : _b.weight) || '280,000 kg' })] })] })] }), _jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [_jsx("button", { type: "button", onClick: function () { return setStep(2); }, className: "rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700", children: t.back }), _jsx("button", { type: "button", onClick: function () {
                                            return runStepTransition(transitionLock, setStepBusy, t.step_3 + '...', 550, function () { return setStep(4); });
                                        }, className: "rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20", children: t.choose_seat })] })] }), _jsx("div", { children: _jsx(RouteMap, { cities: cities, origin: origin, destination: destination, selectedRoute: mapDisplayRoute, isExpanded: isMapExpanded, onToggleExpand: function () { return setIsMapExpanded(!isMapExpanded); } }) })] })), step === 4 && selectedRoute && (_jsxs("section", { className: "grid gap-6 xl:grid-cols-[1fr_400px]", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl", children: [_jsxs("h2", { className: "text-xl font-bold text-white", children: ["4. ", t.seat_map_passenger] }), _jsxs("div", { className: "mt-5 flex flex-wrap items-center justify-between gap-4", children: [_jsx(SeatStateLegend, { lang: lang }), _jsxs("div", { className: "px-4 py-2 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center gap-3 shadow-lg", children: [_jsx("div", { className: "w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-400/20", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5l-3.5 3.5-8.2-1.8L2 10.2l8.2 3.5 3.5 8.2 3.9-3.5z" }) }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1", children: t.aircraft }), _jsxs("p", { className: "text-xs font-bold text-white leading-none capitalize", children: [selectedRoute.plane.split(' ')[0], " ", _jsx("span", { className: "text-cyan-400 font-mono", children: selectedRoute.plane.split(' ').slice(1).join(' ') })] })] })] })] }), _jsx("div", { className: "mt-6", children: _jsx(SeatMap, { lang: lang, seatMatrix: seatMatrix, firstClassSeats: firstClassSeats, seatState: seatState, selectedSeat: selectedSeat, onSelectSeat: setSelectedSeat, columns: columns }) })] }), _jsxs("div", { className: "rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: t.passenger_data }), _jsxs("label", { className: "mt-4 block text-sm font-medium text-slate-300", children: [t.passport, _jsx("input", { value: passport, onChange: function (e) { return applyPassportLookup(e.target.value); }, className: "mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 font-mono text-slate-100 outline-none focus:border-cyan-500", placeholder: "ej. 42152" })] }), _jsxs("label", { className: "mt-4 block text-sm font-medium text-slate-300", children: [t.passenger_name, _jsx("input", { value: passengerName, onChange: function (e) { return setPassengerName(e.target.value); }, className: "mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500", placeholder: "Name" })] }), _jsxs("div", { className: "mt-6 flex flex-wrap gap-3", children: [_jsx("button", { type: "button", onClick: function () { return setStep(3); }, className: "rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700", children: t.back }), canCancelSession && (_jsx("button", { type: "button", onClick: onCancelReservation, className: "rounded-2xl border border-red-500/50 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/20", children: t.cancel }))] })] })] }), _jsx("aside", { className: "space-y-6", children: _jsxs("div", { className: "rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl", children: [_jsx("p", { className: "text-sm text-slate-400", children: t.selected_flight }), _jsxs("p", { className: "mt-2 text-lg font-bold text-white", children: [selectedRoute.flight, " \u00B7 ", origin, " \u2192 ", destination] }), _jsxs("p", { className: "mt-2 text-sm text-slate-400", children: ["Asiento: ", _jsx("strong", { className: "text-white", children: selectedSeat !== null && selectedSeat !== void 0 ? selectedSeat : '—' })] }), _jsx("button", { type: "button", disabled: !reserveEnabled || !passport.trim() || !passengerName.trim(), onClick: function () { return onSubmit('reserva'); }, className: "mt-6 w-full rounded-2xl border-2 border-yellow-400/70 bg-yellow-400/15 py-3 text-sm font-bold text-yellow-50 transition hover:bg-yellow-400/25 disabled:cursor-not-allowed disabled:opacity-35", children: t.reserve }), _jsx("button", { type: "button", disabled: !purchaseEnabled || !passport.trim() || !passengerName.trim(), onClick: function () { return onSubmit('compra'); }, className: "mt-3 w-full rounded-2xl border-2 border-emerald-400/80 bg-emerald-500/20 py-3 text-sm font-bold text-emerald-50 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-35", children: t.buy_sale })] }) })] })), step === 5 && boardingRecord && (_jsxs("section", { className: "mx-auto max-w-2xl space-y-8", children: [_jsx(BoardingPassCard, { lang: lang, record: boardingRecord, brandName: t.brand_name, brandShort: brand.shortName, onSimulateScan: handleWalletScan }), _jsxs("div", { className: "flex flex-col items-center gap-4", children: [cancelWindowSeconds !== null && (_jsxs("button", { type: "button", onClick: function () { return onCancelPurchase(boardingRecord.seat); }, className: "w-full max-w-md rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 px-8 py-4 text-base font-bold text-rose-100 hover:bg-rose-500/20", children: [t.cancel_purchase, " (", cancelWindowSeconds, "s)"] })), _jsx("button", { type: "button", onClick: onNewSearch, className: "w-full max-w-md rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-400 px-8 py-4 text-base font-black text-slate-950 shadow-xl shadow-teal-900/30 transition hover:brightness-110 active:scale-[0.99]", children: t.done_back })] })] })), isMapExpanded && (_jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md", onClick: function () { return setIsMapExpanded(false); }, children: _jsxs("div", { className: "relative w-full max-w-5xl h-[70vh] bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden", onClick: function (e) { return e.stopPropagation(); }, children: [_jsx("button", { onClick: function () { return setIsMapExpanded(false); }, className: "absolute top-6 right-6 z-[201] bg-slate-800 text-white p-2 rounded-full ring-1 ring-white/20 hover:bg-slate-700", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) }), _jsx(RouteMap, { cities: cities, origin: origin, destination: destination, selectedRoute: mapDisplayRoute, className: "h-full w-full" })] }) })), isWalletModalOpen && (_jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in", children: _jsxs("div", { className: "w-full max-w-sm rounded-3xl bg-slate-900 ring-1 ring-white/10 shadow-2xl overflow-hidden text-center p-8 animate-in zoom-in-50 duration-500 ease-out", onClick: function (e) { return e.stopPropagation(); }, children: [_jsx("div", { className: "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/20 mb-6 animate-pulse", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-teal-400", children: [_jsx("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), _jsx("polyline", { points: "22 4 12 14.01 9 11.01" })] }) }), _jsx("h3", { className: "text-2xl font-bold text-white mb-2", children: "Success!" }), _jsx("p", { className: "text-slate-400 text-sm mb-6", children: "Returning to start..." }), _jsx("button", { onClick: function () {
                                setIsWalletModalOpen(false);
                                if (boardingRecord)
                                    downloadWalletDemoJson(boardingRecord, lang);
                                setTimeout(function () { return onNewSearch(); }, 500);
                            }, className: "w-full rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 font-bold transition-colors", children: t.done_back })] }) }))] }));
}
