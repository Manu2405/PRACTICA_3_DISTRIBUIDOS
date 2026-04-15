import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardingRecord, City, CustomerStep, RouteOffer, SeatStateType, Language } from '../types';
import { canPurchase, canReserve, formatTimeInTz, syntheticPreviewRoute } from '../utils';
import { boardingPassQrValue, downloadWalletDemoJson } from '../googleWalletMock';
import { translations, getStatusLabel } from '../i18n';
import { fetchScanStatus, postScan } from '../api';
import RouteMap from './RouteMap';
import SeatMap, { SeatStateLegend } from './SeatMap';
import BoardingPassCard from './BoardingPassCard';
import FlightLoadingOverlay from './FlightLoadingOverlay';
import { aircrafts } from '../data';

type Brand = { name: string; shortName: string };

type PurchaseLoc = { code: string; label: string };

type CustomerViewProps = {
  lang: Language;
  brand: Brand;
  cities: City[];
  purchaseLocations: readonly PurchaseLoc[];
  cityTimezones: Record<string, string>;
  mockPassengers: Record<string, string>;

  step: CustomerStep;
  setStep: (s: CustomerStep) => void;
  purchaseLocation: string;
  setPurchaseLocation: (c: string) => void;
  origin: string;
  destination: string;
  setOrigin: (code: string) => void;
  setDestination: (code: string) => void;
  routeOptions: RouteOffer[];
  selectedRouteIndex: number;
  setSelectedRouteIndex: (i: number) => void;
  selectedRoute: RouteOffer | null;
  seatMatrix: string[][];
  firstClassSeats: number;
  seatState: Record<string, SeatStateType>;
  selectedSeat: string | null;
  setSelectedSeat: (s: string | null) => void;
  passport: string;
  setPassport: (s: string) => void;
  passengerName: string;
  setPassengerName: (s: string) => void;
  sessionReservedSeats: string[];
  reserveTimestamps: Record<string, number>;
  onCancelReservation: () => void;
  onCancelPurchase: (seatId: string) => void;
  onSubmit: (action: 'reserva' | 'compra') => void;
  feedback: { message: string; variant: 'success' | 'error' } | null;
  boardingRecord: BoardingRecord | null;
  onNewSearch: () => void;
  columns: number;
};

function runStepTransition(
  lockRef: MutableRefObject<boolean>,
  setBusy: (v: { show: boolean; msg: string }) => void,
  message: string,
  ms: number,
  go: () => void,
) {
  if (lockRef.current) return;
  lockRef.current = true;
  setBusy({ show: true, msg: message });
  window.setTimeout(() => {
    setBusy({ show: false, msg: '' });
    lockRef.current = false;
    go();
  }, ms);
}

function AnimatedStepper({ step, lang }: { step: CustomerStep; lang: Language }) {
  const t = translations[lang];
  const labels: Record<CustomerStep, string> = {
    1: t.step_1,
    2: t.step_2,
    3: t.step_3,
    4: t.step_4,
    5: t.step_5,
  };
  const steps: CustomerStep[] = [1, 2, 3, 4, 5];

  return (
    <nav className="flex flex-wrap items-end justify-center gap-0.5 sm:gap-2" aria-label="Progreso">
      {steps.map((n, i) => (
        <div key={n} className="flex items-end">
          <div className="flex flex-col items-center gap-1.5 px-0.5 sm:px-2">
            <div
              className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition-all duration-500 ${step === n
                ? 'scale-110 bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/40 ring-2 ring-white/40'
                : step > n
                  ? 'bg-teal-600/40 text-teal-100 ring-1 ring-teal-400/50'
                  : 'bg-slate-800/90 text-slate-500 ring-1 ring-white/10'
                }`}
            >
              {n}
              {step === n ? (
                <span className="pointer-events-none absolute -inset-1 rounded-full border border-cyan-200/50 animate-ping opacity-25" />
              ) : null}
            </div>
            <span
              className={`max-w-[4.75rem] text-center text-[9px] font-bold uppercase leading-tight tracking-wide sm:max-w-[5.5rem] sm:text-[10px] ${step === n ? 'text-cyan-300' : step > n ? 'text-teal-400/90' : 'text-slate-500'
                }`}
            >
              {labels[n]}
            </span>
          </div>
          {i < steps.length - 1 ? (
            <span
              className="sarp-step-plane mb-7 self-end px-0.5 text-sm text-cyan-200/80 sm:mb-8 sm:px-1 sm:text-base"
              aria-hidden
            >
              ✈
            </span>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

export default function CustomerView(props: CustomerViewProps) {
  const {
    lang,
    brand,
    cities,
    purchaseLocations,
    cityTimezones,
    mockPassengers,
    step,
    setStep,
    purchaseLocation,
    setPurchaseLocation,
    origin,
    destination,
    setOrigin,
    setDestination,
    routeOptions,
    selectedRouteIndex,
    setSelectedRouteIndex,
    selectedRoute,
    seatMatrix,
    firstClassSeats,
    seatState,
    selectedSeat,
    setSelectedSeat,
    passport,
    setPassport,
    passengerName,
    setPassengerName,
    sessionReservedSeats,
    reserveTimestamps,
    onCancelReservation,
    onCancelPurchase,
    onSubmit,
    feedback,
    boardingRecord,
    onNewSearch,
    columns,
  } = props;

  const t = translations[lang];
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const originCities = cities.filter((c) => c.code !== destination);
  const destCities = cities.filter((c) => c.code !== origin);
  const oCity = cities.find((c) => c.code === origin);
  const dCity = cities.find((c) => c.code === destination);
  const tzO = oCity ? cityTimezones[oCity.code] : undefined;
  const tzD = dCity ? cityTimezones[dCity.code] : undefined;

  const seatSt = selectedSeat ? seatState[selectedSeat] : undefined;
  const reserveEnabled = step >= 4 && Boolean(selectedSeat) && canReserve(seatSt);
  const purchaseEnabled = step >= 4 && Boolean(selectedSeat) && canPurchase(seatSt);
  const canCancelSession =
    selectedSeat != null &&
    sessionReservedSeats.includes(selectedSeat) &&
    seatSt === 'reserved';

  const activeReservations = useMemo(
    () =>
      sessionReservedSeats.map((seat) => {
        const stamp = reserveTimestamps[seat];
        const elapsedMs = typeof stamp === 'number' ? now.getTime() - stamp : 0;
        const remainingSeconds = Math.max(
          0,
          Math.ceil((60000 - elapsedMs) / 1000),
        );

        return {
          seat,
          stamp,
          remainingSeconds,
        };
      }),
    [sessionReservedSeats, reserveTimestamps, now],
  );

  const applyPassportLookup = (value: string) => {
    setPassport(value);
    const hit = mockPassengers[value.trim()];
    if (hit) setPassengerName(hit);
  };

  const [stepBusy, setStepBusy] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isScanningWallet, setIsScanningWallet] = useState(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const transitionLock = useRef(false);

  const [cancelWindowSeconds, setCancelWindowSeconds] = useState<number | null>(null);

  // Cancellation window logic
  useEffect(() => {
    if (step === 5 && boardingRecord?.issuedAtISO && boardingRecord.kind === 'compra') {
      const issuedAt = new Date(boardingRecord.issuedAtISO).getTime();
      const updateSeconds = () => {
        const diff = (issuedAt + 300000 - Date.now()) / 1000;
        if (diff <= 0) {
          setCancelWindowSeconds(null);
        } else {
          setCancelWindowSeconds(Math.floor(diff));
        }
      };
      updateSeconds();
      const timer = setInterval(updateSeconds, 1000);
      return () => clearInterval(timer);
    } else {
      setCancelWindowSeconds(null);
    }
  }, [step, boardingRecord]);

  const handleWalletScan = async () => {
    if (isScanningWallet) return;
    setScanMessage('');
    setIsScanningWallet(true);

    if (boardingRecord) {
      try {
        const result = await postScan({
          boardingPass: boardingPassQrValue(boardingRecord),
          source: 'customer-wallet',
          passport: boardingRecord.passport,
          flight: boardingRecord.flight,
          seat: boardingRecord.seat,
          kind: boardingRecord.kind,
        });

        if (result?.message) {
          setScanMessage(result.message);
        }

        const status = await fetchScanStatus();
        if (status?.lastMatched) {
          setScanMessage((prev) => prev || (lang === 'es' ? 'Escaneo validado por backend.' : 'Scan validated by backend.'));
        }
      } catch (error) {
        console.error('Error enviando escaneo al backend', error);
        setScanMessage(lang === 'es' ? 'No se pudo validar el escaneo en backend.' : 'Could not validate scan on backend.');
      }
    }

    setTimeout(() => {
      setIsScanningWallet(false);
      setIsWalletModalOpen(true);
    }, 1500);
  };

  const scannerBuffer = useRef<string>('');
  const scannerTimeout = useRef<number | null>(null);

  useEffect(() => {
    let t: number;
    if (isWalletModalOpen) {
      t = window.setTimeout(() => {
        setIsWalletModalOpen(false);
        onNewSearch();
      }, 4500);
    }
    return () => window.clearTimeout(t);
  }, [isWalletModalOpen, onNewSearch]);

  useEffect(() => {
    if (step !== 5 || !boardingRecord) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Enter') {
        const buffer = scannerBuffer.current.trim();
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
      if (scannerTimeout.current) window.clearTimeout(scannerTimeout.current);
      scannerTimeout.current = window.setTimeout(() => {
        scannerBuffer.current = '';
      }, 120);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scannerTimeout.current) window.clearTimeout(scannerTimeout.current);
    };
  }, [step, isScanningWallet, boardingRecord]);

  const sortedRoutes = useMemo(() => {
    return routeOptions.map((offer, originalIndex) => ({ offer, originalIndex }));
  }, [routeOptions]);

  const { minEconomy, minTime } = useMemo(() => {
    if (routeOptions.length === 0) return { minEconomy: 0, minTime: 0 };
    return {
      minEconomy: Math.min(...routeOptions.map(o => o.economy)),
      minTime: Math.min(...routeOptions.map(o => o.time))
    };
  }, [routeOptions]);

  const mapDisplayRoute = useMemo(() => {
    if (step === 1) return syntheticPreviewRoute(origin, destination);
    if (selectedRoute) return selectedRoute;
    return syntheticPreviewRoute(origin, destination);
  }, [step, selectedRoute, origin, destination]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {stepBusy.show ? <FlightLoadingOverlay message={stepBusy.msg} /> : null}

      <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl ring-1 ring-teal-500/10 sm:flex-row sm:justify-center">
        <AnimatedStepper step={step} lang={lang} />
      </div>

      {/* --- Paso 1 --- */}
      {step === 1 && (
        <section className="grid gap-6 lg:grid-cols-[1fr_minmax(0,520px)]">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white">1. {t.origin}, {t.destination}</h2>
            <label className="mt-6 block text-sm font-medium text-slate-300">
              {t.buy_from}
              <div className="relative mt-2">
                <select
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
                  value={purchaseLocation}
                  onChange={(e) => setPurchaseLocation(e.target.value)}
                >
                  {purchaseLocations.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-800/40 p-3 ring-1 ring-white/5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">{t.local_time_point}</p>
                      <p className="text-sm font-bold text-slate-200">
                        {formatTimeInTz(now, cityTimezones[purchaseLocation])}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none mb-1">{t.timezone_label}</p>
                    <p className="text-[10px] font-mono text-cyan-400/80">{cityTimezones[purchaseLocation] || 'UTC'}</p>
                  </div>
                </div>
              </div>
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-300">
                {t.origin}
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                >
                  {originCities.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.label} ({city.country})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-300">
                {t.destination}
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  {destCities.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.label} ({city.country})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  runStepTransition(transitionLock, setStepBusy, t.step_1 + '...', 780, () => {
                    onNewSearch();
                    setStep(2);
                  })
                }
                className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98]"
              >
                {t.search_routes}
              </button>
            </div>
          </div>
          <div className={`rounded-3xl border border-white/10 bg-slate-900/50 p-4 ring-1 ring-cyan-500/10 transition-all duration-500 ${isMapExpanded ? 'lg:col-span-2 fixed inset-4 z-[150] bg-slate-950/95 backdrop-blur-xl flex flex-col' : 'relative'}`}>
            <div className="flex items-center justify-between mb-4">
               <p className="text-sm font-semibold text-slate-300">{t.live_map}</p>
               <button 
                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                  className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  title={isMapExpanded ? 'Close' : 'Expand'}
               >
                  {isMapExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v5H3M21 8h-5V3M3 16h5v5M16 21v-5h5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 3 6 6-6 6M9 21l-6-6 6-6"/></svg>
                  )}
               </button>
            </div>
            <div className={`mt-0 flex-grow ${isMapExpanded ? 'h-full' : 'h-72'}`}>
              <RouteMap 
                cities={cities} 
                origin={origin} 
                destination={destination} 
                selectedRoute={mapDisplayRoute} 
                isExpanded={isMapExpanded}
                className="w-full h-full" 
              />
            </div>
          </div>
        </section>
      )}

      {/* --- Paso 2 --- */}
      {step === 2 && (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white">2. {t.suggested_routes}</h2>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-700/50 pb-6 mb-6">
              {sortedRoutes.filter(({ offer }) => offer.economy === minEconomy || offer.time === minTime).map(({ offer: option, originalIndex }) => {
                const isCheapest = option.economy === minEconomy;
                const isFastest = option.time === minTime;
                return (
                  <button
                    type="button"
                    key={`featured-${option.path.join('-')}-${originalIndex}`}
                    onClick={() => {
                      setSelectedRouteIndex(originalIndex);
                      setStepBusy({ show: true, msg: t.step_2 + '...' });
                      transitionLock.current = true;
                      window.setTimeout(() => {
                        setStepBusy({ show: false, msg: '' });
                        setStep(3);
                        transitionLock.current = false;
                      }, 1800);
                    }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-slate-800/80 p-5 text-left shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-slate-800 hover:shadow-emerald-500/20"
                  >
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-wrap gap-2 items-center">
                           <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                              {option.type}
                           </span>
                           <span className="text-[9px] font-black text-emerald-300 uppercase tracking-[0.15em] bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm">
                              {isCheapest && isFastest ? t.cheapest_fastest : isCheapest ? t.best_cost : t.best_time}
                           </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                           <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                           <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">{getStatusLabel(option.status, lang)}</span>
                        </div>
                      </div>
                      <p className="mt-3 font-bold text-white text-lg">
                        {option.path.join(' → ')}
                      </p>
                      <div className="mt-2 flex flex-col gap-1 text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-400">{t.flight_code}:</span>
                          <span>{option.flight}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-400">{t.aircraft}:</span>
                          <span className="text-cyan-200/70">{option.plane}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="flex items-center gap-1.5 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            {option.time}h {t.travel_time}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-900/50 p-3 ring-1 ring-white/5">
                      <div className="text-left">
                        <span className="text-[10px] uppercase text-slate-400">{t.economy}</span>
                        <div className="text-xl font-bold text-emerald-400">${option.economy}</div>
                      </div>
                      <div className="text-right opacity-80">
                        <span className="text-[10px] uppercase text-slate-500">{t.first_class}</span>
                        <div className="text-lg font-bold text-slate-300">${option.first}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <h3 className="text-md font-bold text-slate-300 mb-4">{t.other_options}</h3>
            <div className="space-y-4">
              {routeOptions.length > 0 ? (
                sortedRoutes.filter(({ offer }) => offer.economy !== minEconomy && offer.time !== minTime).map(({ offer: option, originalIndex }) => (
                  <button
                    type="button"
                    key={`${option.path.join('-')}-${originalIndex}`}
                    onClick={() => {
                      setSelectedRouteIndex(originalIndex);
                      setSelectedSeat(null);
                    }}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition-all duration-200 active:scale-[0.99] ${selectedRouteIndex === originalIndex
                      ? 'border-cyan-400 bg-cyan-500/15 shadow-lg shadow-cyan-500/15'
                      : 'border-slate-700 bg-slate-800/80 hover:border-slate-500'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {option.type}
                      </span>
                      <div className="flex items-center gap-1.5">
                         <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 opacity-50" />
                         <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-tight">{getStatusLabel(option.status, lang)}</span>
                      </div>
                    </div>
                    <p className="mt-3 font-semibold text-white text-lg">
                      {option.path.join(' → ')}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight mt-1">
                      {option.plane}
                    </p>
                    <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-900/50 p-3 ring-1 ring-white/5">
                      <div className="text-left">
                        <span className="text-[10px] uppercase text-slate-400">{t.economy}</span>
                        <div className="text-lg font-bold text-emerald-400">${option.economy}</div>
                      </div>
                      <div className="text-right">
                         <span className="flex items-center gap-1.5 text-xs text-slate-400">
                            {option.time}h
                          </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl bg-slate-800 p-8 text-slate-400">No hay rutas.</div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                {t.back}
              </button>
              <button
                type="button"
                disabled={!routeOptions.length}
                onClick={() =>
                  runStepTransition(transitionLock, setStepBusy, t.step_2 + '...', 600, () => setStep(3))
                }
                className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.continue_flight}
              </button>
            </div>
          </div>
          <div>
            <div className="relative group rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-lg">
              <div className="absolute top-4 right-4 z-50">
                <button onClick={() => setIsMapExpanded(true)} className="bg-slate-900/90 text-xs font-bold text-white px-3 py-2 rounded-xl ring-1 ring-white/20 shadow-xl transition duration-300 hover:bg-slate-800 flex items-center gap-2">
                   {t.expand_map}
                </button>
              </div>
              <RouteMap cities={cities} origin={origin} destination={destination} selectedRoute={mapDisplayRoute} isExpanded={isMapExpanded} onToggleExpand={() => setIsMapExpanded(!isMapExpanded)} />
            </div>
          </div>
        </section>
      )}

      {/* --- Paso 3 --- */}
      {step === 3 && selectedRoute && (
        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white">3. {t.selected_flight}</h2>
            <div className="mt-4 flex items-center gap-3 mb-4">
               <span className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  {getStatusLabel(selectedRoute.status, lang)}
               </span>
               <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                  {selectedRoute.type}
               </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-800/80 p-4 ring-1 ring-white/5">
                <p className="text-xs uppercase tracking-wider text-slate-500">{t.departure}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">{selectedRoute.departure}</p>
                <p className="text-sm text-slate-400">{oCity?.label}</p>
              </div>
              <div className="rounded-2xl bg-slate-800/80 p-4 ring-1 ring-white/5">
                <p className="text-xs uppercase tracking-wider text-slate-500">{t.arrival}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">{selectedRoute.arrival}</p>
                <p className="text-sm text-slate-400">{dCity?.label}</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
              <p className="text-sm text-cyan-200/90">{t.flight_code}</p>
              <p className="mt-1 text-3xl font-bold text-white">{selectedRoute.flight}</p>
              <p className="mt-2 text-sm text-slate-400">{selectedRoute.airline}</p>
              <p className="mt-3 text-sm text-slate-400">
                {t.gate}: <span className="font-mono text-slate-200">{selectedRoute.gate}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                <span>{t.economy}: <strong className="text-emerald-300">${selectedRoute.economy}</strong></span>
                <span>{t.first_class}: <strong className="text-cyan-200">${selectedRoute.first}</strong></span>
                <span>{t.duration}: <strong className="text-white">{selectedRoute.time} h</strong></span>
              </div>
              <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                 <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t.aircraft}</p>
                    <p className="text-sm font-bold text-slate-200">{selectedRoute.plane}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t.manufacturer}</p>
                    <p className="text-sm font-bold text-slate-200">{aircrafts.find(a => a.model === selectedRoute.plane)?.manufacturer || 'Airbus'}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t.weight}</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono">{aircrafts.find(a => a.model === selectedRoute.plane)?.weight || '280,000 kg'}</p>
                 </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                {t.back}
              </button>
              <button
                type="button"
                onClick={() =>
                  runStepTransition(transitionLock, setStepBusy, t.step_3 + '...', 550, () => setStep(4))
                }
                className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20"
              >
                {t.choose_seat}
              </button>
            </div>
          </div>
          <div>
            <RouteMap cities={cities} origin={origin} destination={destination} selectedRoute={mapDisplayRoute} isExpanded={isMapExpanded} onToggleExpand={() => setIsMapExpanded(!isMapExpanded)} />
          </div>
        </section>
      )}

      {/* --- Paso 4 --- */}
      {step === 4 && selectedRoute && (
        <section className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white">4. {t.seat_map_passenger}</h2>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <SeatStateLegend lang={lang} />
                <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center gap-3 shadow-lg">
                   <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-400/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5l-3.5 3.5-8.2-1.8L2 10.2l8.2 3.5 3.5 8.2 3.9-3.5z"/></svg>
                   </div>
                   <div>
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">{t.aircraft}</p>
                      <p className="text-xs font-bold text-white leading-none capitalize">{selectedRoute.plane.split(' ')[0]} <span className="text-cyan-400 font-mono">{selectedRoute.plane.split(' ').slice(1).join(' ')}</span></p>
                   </div>
                </div>
              </div>
              <div className="mt-6">
                <SeatMap
                  lang={lang}
                  seatMatrix={seatMatrix}
                  firstClassSeats={firstClassSeats}
                  seatState={seatState}
                  selectedSeat={selectedSeat}
                  onSelectSeat={setSelectedSeat}
                  columns={columns}
                />
              </div>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white">{t.passenger_data}</h3>
              <label className="mt-4 block text-sm font-medium text-slate-300">
                {t.passport}
                <input
                  value={passport}
                  onChange={(e) => applyPassportLookup(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 font-mono text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="ej. 42152"
                />
              </label>
              <label className="mt-4 block text-sm font-medium text-slate-300">
                {t.passenger_name}
                <input
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="Name"
                />
              </label>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
                >
                  {t.back}
                </button>
                {canCancelSession && (
                  <button
                    type="button"
                    onClick={onCancelReservation}
                    className="rounded-2xl border border-red-500/50 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/20"
                  >
                    {t.cancel}
                  </button>
                )}
              </div>
            </div>
          </div>
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <p className="text-sm text-slate-400">{t.selected_flight}</p>
              <p className="mt-2 text-lg font-bold text-white">
                {selectedRoute.flight} · {origin} → {destination}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {lang === 'en'
                  ? 'Selected seat:'
                  : lang === 'pt'
                    ? 'Assento selecionado:'
                    : 'Asiento seleccionado:'} <strong className="text-white">{selectedSeat ?? '?'}</strong>
              </p>
              <button
                type="button"
                disabled={!reserveEnabled || !passport.trim() || !passengerName.trim()}
                onClick={() => onSubmit('reserva')}
                className="mt-6 w-full rounded-2xl border-2 border-yellow-400/70 bg-yellow-400/15 py-3 text-sm font-bold text-yellow-50 transition hover:bg-yellow-400/25 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {t.reserve}
              </button>
              <button
                type="button"
                disabled={!purchaseEnabled || !passport.trim() || !passengerName.trim()}
                onClick={() => onSubmit('compra')}
                className="mt-3 w-full rounded-2xl border-2 border-emerald-400/80 bg-emerald-500/20 py-3 text-sm font-bold text-emerald-50 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {t.buy_sale}
              </button>
            </div>
            {activeReservations.length > 0 && (
              <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-6 shadow-xl shadow-cyan-950/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200/70">
                      {lang === 'en'
                        ? 'Active reservations'
                        : lang === 'pt'
                          ? 'Reservas ativas'
                          : 'Reservas activas'}
                    </p>
                    <h4 className="mt-1 text-lg font-bold text-white">
                      {lang === 'en'
                        ? 'Your reserved seats are timing out soon'
                        : lang === 'pt'
                          ? 'Seus assentos reservados est?o expirando'
                          : 'Tus asientos reservados est?n expirando'}
                    </h4>
                  </div>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-100">
                    {activeReservations.length}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {activeReservations.map((reservation) => (
                    <div
                      key={reservation.seat}
                      className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{reservation.seat}</p>
                          <p className="text-xs text-slate-400">
                            {lang === 'en'
                              ? 'Expires in'
                              : lang === 'pt'
                                ? 'Expira em'
                                : 'Expira en'} {' '}
                            {reservation.remainingSeconds}s
                          </p>
                        </div>
                        <div className="min-w-24 text-right">
                          <p className="text-lg font-black text-cyan-200">{reservation.remainingSeconds}s</p>
                        </div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 transition-all duration-1000"
                          style={{ width: `${Math.max(0, Math.min(100, (reservation.remainingSeconds / 60) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      )}

      {/* --- Paso 5 --- */}
      {step === 5 && boardingRecord && (
        <section className="mx-auto max-w-2xl space-y-8">
          <BoardingPassCard 
            lang={lang} 
            record={boardingRecord} 
            brandName={t.brand_name} 
            brandShort={brand.shortName} 
            onSimulateScan={handleWalletScan} 
          />
          <div className="flex flex-col items-center gap-4">
             {cancelWindowSeconds !== null && (
              <button
                type="button"
                onClick={() => onCancelPurchase(boardingRecord.seat)}
                className="w-full max-w-md rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 px-8 py-4 text-base font-bold text-rose-100 hover:bg-rose-500/20"
              >
                {t.cancel_purchase} ({cancelWindowSeconds}s)
              </button>
            )}
            
            <button
              type="button"
              onClick={onNewSearch}
              className="w-full max-w-md rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-400 px-8 py-4 text-base font-black text-slate-950 shadow-xl shadow-teal-900/30 transition hover:brightness-110 active:scale-[0.99]"
            >
              {t.done_back}
            </button>
          </div>
        </section>
      )}

      {/* Modal Expansion de Mapa */}
      {isMapExpanded && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsMapExpanded(false)}>
          <div className="relative w-full max-w-5xl h-[70vh] bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsMapExpanded(false)}
              className="absolute top-6 right-6 z-[201] bg-slate-800 text-white p-2 rounded-full ring-1 ring-white/20 hover:bg-slate-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <RouteMap cities={cities} origin={origin} destination={destination} selectedRoute={mapDisplayRoute} className="h-full w-full" />
          </div>
        </div>
      )}

      {/* Modal de Escaneo en Wallet */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 ring-1 ring-white/10 shadow-2xl overflow-hidden text-center p-8 animate-in zoom-in-50 duration-500 ease-out" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/20 mb-6 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
            <p className="text-slate-400 text-sm mb-6">
              Returning to start...
            </p>
            {scanMessage && (
              <p className="mb-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-left text-xs text-cyan-100">
                {scanMessage}
              </p>
            )}
            <button
               onClick={() => {
                  setIsWalletModalOpen(false);
                  if (boardingRecord) downloadWalletDemoJson(boardingRecord, lang);
                  setTimeout(() => onNewSearch(), 500);
              }}
              className="w-full rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 font-bold transition-colors"
            >
              {t.done_back}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
