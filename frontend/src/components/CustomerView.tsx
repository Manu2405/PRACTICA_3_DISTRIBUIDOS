import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardingRecord, City, CustomerStep, RouteOffer, SeatStateType } from '../types';
import { canPurchase, canReserve, formatTimeInTz, syntheticPreviewRoute } from '../utils';
import { boardingPassQrValue, downloadWalletDemoJson } from '../googleWalletMock';
import RouteMap from './RouteMap';
import SeatMap, { SeatStateLegend } from './SeatMap';
import BoardingPassCard from './BoardingPassCard';
import FlightLoadingOverlay from './FlightLoadingOverlay';
import { aircrafts } from '../data';

type Brand = { name: string; shortName: string };

type PurchaseLoc = { code: string; label: string };

type CustomerViewProps = {
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
  seatState: Record<string, SeatStateType>;
  selectedSeat: string | null;
  setSelectedSeat: (s: string | null) => void;
  passport: string;
  setPassport: (s: string) => void;
  passengerName: string;
  setPassengerName: (s: string) => void;
  sessionReservedSeats: string[];
  onCancelReservation: () => void;
  onSubmit: (action: 'reserva' | 'compra') => void;
  feedback: { message: string; variant: 'success' | 'error' } | null;
  boardingRecord: BoardingRecord | null;
  onNewSearch: () => void;
};

const STEP_ORDER: CustomerStep[] = [1, 2, 3, 4, 5];

const STEP_LABELS: Record<CustomerStep, string> = {
  1: 'Buscar',
  2: 'Ruta',
  3: 'Vuelo',
  4: 'Asiento',
  5: 'Pase',
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

function AnimatedStepper({ step }: { step: CustomerStep }) {
  return (
    <nav className="flex flex-wrap items-end justify-center gap-0.5 sm:gap-2" aria-label="Progreso de reserva">
      {STEP_ORDER.map((n, i) => (
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
              {STEP_LABELS[n]}
            </span>
          </div>
          {i < STEP_ORDER.length - 1 ? (
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
    seatState,
    selectedSeat,
    setSelectedSeat,
    passport,
    setPassport,
    passengerName,
    setPassengerName,
    sessionReservedSeats,
    onCancelReservation,
    onSubmit,
    feedback,
    boardingRecord,
    onNewSearch,
  } = props;

  const originCities = cities.filter((c) => c.code !== destination);
  const destCities = cities.filter((c) => c.code !== origin);
  const now = new Date();
  const clientTzLabel = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'local';
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

  const applyPassportLookup = (value: string) => {
    setPassport(value);
    const hit = mockPassengers[value.trim()];
    if (hit) setPassengerName(hit);
  };

  const [stepBusy, setStepBusy] = useState<{ show: boolean; msg: string }>({ show: false, msg: '' });
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isScanningWallet, setIsScanningWallet] = useState(false);
  const transitionLock = useRef(false);

  const handleWalletScan = () => {
    if (isScanningWallet) return;
    setIsScanningWallet(true);
    setTimeout(() => {
      setIsScanningWallet(false);
      setIsWalletModalOpen(true);
    }, 1500);
  };

  // Detección de ESCÁNER LÁSER REAL (Lector de códigos de barras/QR USB/Bluetooth)
  // Los escáneres físicos actúan como un teclado que escribe toda la cadena de datos en milisegundos y pulsa Enter.
  const scannerBuffer = useRef<string>('');
  const scannerTimeout = useRef<number | null>(null);

  // Auto-regreso al inicio al terminar de escanear/validar
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

  // Simulación Automática (Modo Presentación)
  // Como no hay backend, esperamos 15 segundos asumiendo que el usuario está escaneando
  // con su app de Google Wallet local y guardándolo en su teléfono.
  useEffect(() => {
    let tScan: number;
    if (step === 5 && boardingRecord && !isWalletModalOpen && !isScanningWallet) {
      tScan = window.setTimeout(() => {
        handleWalletScan();
      }, 15000); // 15 Segundos de espera para que hagan la demostración con el teléfono
    }
    return () => window.clearTimeout(tScan);
  }, [step, boardingRecord, isWalletModalOpen, isScanningWallet]);

  useEffect(() => {
    if (step !== 5 || !boardingRecord) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoramos teclas de control puro
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        const buffer = scannerBuffer.current.trim();
        // Validamos que la lectura real contenga datos del boleto (previene enters accidentales)
        // Usamos una verificación parcial para evitar problemas con la configuración de idioma del teclado vs escáner
        if (buffer.includes(boardingRecord.passport) || buffer.includes('SARP_BOARDING_PASS') || buffer.includes(boardingRecord.flight.replace(/\s+/g, ''))) {
          e.preventDefault();
          handleWalletScan();
        }
        scannerBuffer.current = '';
        return;
      }

      // Evitamos letras sueltas como 'Tab', 'Shift', etc.
      if (e.key.length === 1) {
        scannerBuffer.current += e.key;
      }
      
      // Limpiamos el buffer si tardan más de 120ms entre teclas (un humano tecleando, no un escáner)
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

  // Default sorted routes as they come from computeRoutes
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
        <AnimatedStepper step={step} />
      </div>

      {/* --- Paso 1 --- */}
      {step === 1 && (
        <section className="grid gap-6 lg:grid-cols-[1fr_minmax(0,520px)]">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white">1. Origen, destino y punto de compra</h2>
            <label className="mt-6 block text-sm font-medium text-slate-300">
              Estoy comprando desde
              <select
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
                value={purchaseLocation}
                onChange={(e) => setPurchaseLocation(e.target.value)}
              >
                {purchaseLocations.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-300">
                Origen
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
                Destino
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
            <div className="mt-6 rounded-2xl bg-slate-800/60 p-4 text-xs text-slate-500 ring-1 ring-white/5">
              <p>
                <span className="text-slate-300">Hora local del cliente:</span> {formatTimeInTz(now, clientTzLabel)} ·{' '}
                <span className="font-mono text-slate-400">{clientTzLabel}</span>
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  runStepTransition(transitionLock, setStepBusy, 'Buscando rutas…', 780, () => setStep(2))
                }
                className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98]"
              >
                Buscar rutas
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-4 ring-1 ring-cyan-500/10">
            <p className="text-sm font-semibold text-slate-300">Mapa en vivo</p>
            <p className="mt-1 text-xs text-slate-500">Ruta y avión animados según origen y destino.</p>
            <div className="mt-4">
              <RouteMap cities={cities} origin={origin} destination={destination} selectedRoute={mapDisplayRoute} className="h-72" />
            </div>
          </div>
        </section>
      )}

      {/* --- Paso 2 --- */}
      {step === 2 && (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white">2. Rutas sugeridas</h2>

            {/* Destacados (Mejor costo y Mejor tiempo) */}
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
                      setStepBusy({ show: true, msg: 'Asignando itinerario...' });
                      transitionLock.current = true;
                      window.setTimeout(() => {
                        setStepBusy({ show: false, msg: '' });
                        setStep(3);
                        transitionLock.current = false;
                      }, 1800);
                    }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-slate-800/80 p-5 text-left shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-1 hover:border-emerald-400/50 hover:bg-slate-800 hover:shadow-emerald-500/20"
                  >
                    <div className="absolute top-0 right-0 bg-emerald-500/20 px-3 py-1 rounded-bl-xl border-b border-l border-emerald-500/30">
                      <span className="text-[10px] flex items-center gap-1.5 font-bold text-emerald-300 uppercase tracking-widest">
                        {isCheapest && isFastest ? (
                          <><span className="animate-bounce text-sm">🌟</span> Menor Costo y Tiempo</>
                        ) : isCheapest ? (
                          <><span className="animate-bounce text-sm">🌟</span> Menor Costo</>
                        ) : (
                          <><span className="animate-pulse text-sm text-yellow-400">⚡</span> Menor Tiempo</>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {option.type}
                      </span>
                      <p className="mt-3 font-bold text-white text-lg">
                        {option.path.join(' → ')}
                      </p>
                      <div className="mt-2 flex flex-col gap-1 text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-400">Vuelo(s):</span>
                          <span>{option.flight}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-400">Avión:</span>
                          <span className="text-cyan-200">
                            {option.plane.split(' / ').map(p => {
                              const ac = aircrafts.find(a => a.model === p);
                              return ac ? `${p} (Peso: ${ac.weight})` : p;
                            }).join(' / ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="flex items-center gap-1.5 font-medium">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            {option.time}h de viaje
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-900/50 p-3 ring-1 ring-white/5">
                      <div className="text-left">
                        <span className="text-[10px] uppercase text-slate-400">Económica</span>
                        <div className="text-xl font-bold text-emerald-400">${option.economy}</div>
                      </div>
                      <div className="text-right opacity-80">
                        <span className="text-[10px] uppercase text-slate-500">Primera</span>
                        <div className="text-lg font-bold text-slate-300">${option.first}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <h3 className="text-md font-bold text-slate-300 mb-4">Otras opciones</h3>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {option.type}
                      </span>
                    </div>
                    <p className="mt-3 font-semibold text-white text-lg">
                      {option.path.join(' → ')}
                    </p>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-400">Vuelo(s):</span>
                        <span>{option.flight}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-400">Avión:</span>
                        <span className="text-cyan-200">
                          {option.plane.split(' / ').map(p => {
                            const ac = aircrafts.find(a => a.model === p);
                            return ac ? `${p} (Peso: ${ac.weight})` : p;
                          }).join(' / ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                          {option.time}h de viaje
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-900/50 p-3 ring-1 ring-white/5">
                      <div className="text-left">
                        <span className="text-[10px] uppercase text-slate-400">Económica</span>
                        <div className="text-xl font-bold text-emerald-400">${option.economy}</div>
                      </div>
                      <div className="text-right opacity-80">
                        <span className="text-[10px] uppercase text-slate-500">Primera</span>
                        <div className="text-lg font-bold text-slate-300">${option.first}</div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl bg-slate-800 p-8 text-slate-400">
                  No hay rutas para esta pareja. Vuelve al paso 1 y cambia ciudades.
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                Atrás
              </button>
              <button
                type="button"
                disabled={!routeOptions.length}
                onClick={() =>
                  runStepTransition(transitionLock, setStepBusy, 'Preparando itinerario…', 600, () => setStep(3))
                }
                className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar al vuelo
              </button>
            </div>
          </div>
          <div>
            <div className="relative group rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-lg">
              <div className="absolute top-4 right-4 z-50">
                <button onClick={() => setIsMapExpanded(true)} className="bg-slate-900/90 text-xs font-bold text-white px-3 py-2 rounded-xl ring-1 ring-white/20 shadow-xl opacity-0 group-hover:opacity-100 transition duration-300 hover:bg-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-expand"><path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8M3 21l6-6M3 21v-4.8M3 21h4.8M3 3l6 6M3 3v4.8M3 3h4.8M21 3l-6 6M21 3v4.8M21 3h-4.8" /></svg>
                  Ampliar Mapa
                </button>
              </div>
              <RouteMap cities={cities} origin={origin} destination={destination} selectedRoute={mapDisplayRoute} />
            </div>
          </div>
        </section>
      )}

      {/* --- Paso 3 --- */}
      {step === 3 && !selectedRoute ? (
        <div className="rounded-3xl border border-amber-500/30 bg-slate-900/80 p-8 text-center text-slate-300">
          <p>No hay vuelo seleccionado.</p>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-4 rounded-2xl bg-cyan-400 px-6 py-2 text-sm font-bold text-slate-950"
          >
            Volver a rutas
          </button>
        </div>
      ) : null}

      {step === 3 && selectedRoute ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white">3. Vuelo seleccionado</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-800/80 p-4 ring-1 ring-white/5">
                <p className="text-xs uppercase tracking-wider text-slate-500">Salida / origen</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">{selectedRoute.departure}</p>
                <p className="text-sm text-slate-400">
                  {oCity?.label} — {tzO ? formatTimeInTz(now, tzO) : '—'}
                </p>
                {tzO ? <p className="mt-1 font-mono text-xs text-slate-500">{tzO}</p> : null}
              </div>
              <div className="rounded-2xl bg-slate-800/80 p-4 ring-1 ring-white/5">
                <p className="text-xs uppercase tracking-wider text-slate-500">Llegada / destino</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">{selectedRoute.arrival}</p>
                <p className="text-sm text-slate-400">
                  {dCity?.label} — {tzD ? formatTimeInTz(now, tzD) : '—'}
                </p>
                {tzD ? <p className="mt-1 font-mono text-xs text-slate-500">{tzD}</p> : null}
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
              <p className="text-sm text-cyan-200/90">Código(s) de vuelo</p>
              <p className="mt-1 text-3xl font-bold text-white">{selectedRoute.flight}</p>
              <p className="mt-2 text-sm text-slate-400">{selectedRoute.airline}</p>
              <p className="text-sm text-slate-500">
                {selectedRoute.plane.split(' / ').map(p => {
                  const ac = aircrafts.find(a => a.model === p);
                  return ac ? `${p} (Peso: ${ac.weight})` : p;
                }).join(' / ')}
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Puerta(s): <span className="font-mono text-slate-200">{selectedRoute.gate}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                <span>
                  Económica: <strong className="text-emerald-300">${selectedRoute.economy}</strong>
                </span>
                <span>
                  Primera: <strong className="text-cyan-200">${selectedRoute.first}</strong>
                </span>
                <span>
                  Duración total: <strong className="text-white">{selectedRoute.time} h</strong>
                </span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() =>
                  runStepTransition(transitionLock, setStepBusy, 'Abriendo cabina…', 550, () => setStep(4))
                }
                className="rounded-2xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20"
              >
                Elegir asiento
              </button>
            </div>
          </div>
          <div>
            <RouteMap cities={cities} origin={origin} destination={destination} selectedRoute={mapDisplayRoute} />
          </div>
        </section>
      ) : null}

      {/* --- Paso 4 --- */}
      {step === 4 && !selectedRoute ? (
        <div className="rounded-3xl border border-amber-500/30 bg-slate-900/80 p-8 text-center text-slate-300">
          <p>No hay vuelo activo.</p>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="mt-4 rounded-2xl bg-cyan-400 px-6 py-2 text-sm font-bold text-slate-950"
          >
            Volver
          </button>
        </div>
      ) : null}

      {step === 4 && selectedRoute ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white">4. Mapa de asientos y pasajero</h2>
              <div className="mt-5">
                <SeatStateLegend />
              </div>
              <div className="mt-6">
                <SeatMap
                  seatMatrix={seatMatrix}
                  seatState={seatState}
                  selectedSeat={selectedSeat}
                  onSelectSeat={setSelectedSeat}
                />
              </div>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white">Datos del pasajero</h3>
              <p className="mt-1 text-xs text-slate-500">
                Mock: prueba pasaporte <span className="font-mono text-slate-400">42152</span> o{' '}
                <span className="font-mono text-slate-400">SARP001</span> para autocompletar.
              </p>
              <label className="mt-4 block text-sm font-medium text-slate-300">
                Pasaporte / documento
                <input
                  value={passport}
                  onChange={(e) => applyPassportLookup(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 font-mono text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="ej. 42152"
                  autoComplete="off"
                />
              </label>
              <label className="mt-4 block text-sm font-medium text-slate-300">
                Pasajero
                <input
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="Nombre completo"
                />
              </label>
              {feedback && step === 4 ? (
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm ring-1 ${feedback.variant === 'success'
                    ? 'bg-emerald-500/10 text-emerald-100 ring-emerald-400/30'
                    : 'bg-amber-500/10 text-amber-100 ring-amber-400/30'
                    }`}
                  role="status"
                >
                  {feedback.message}
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-2xl border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700"
                >
                  Atrás
                </button>
                {canCancelSession ? (
                  <button
                    type="button"
                    onClick={onCancelReservation}
                    className="rounded-2xl border border-red-500/50 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-100 hover:bg-red-500/20"
                  >
                    Anular reserva
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <p className="text-sm text-slate-400">Resumen</p>
              <p className="mt-2 text-lg font-bold text-white">
                {selectedRoute.flight} · {origin} → {destination}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Asiento: <strong className="text-white">{selectedSeat ?? '—'}</strong>
              </p>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                Reservar solo <span className="text-indigo-300">Libre</span>. Comprar desde{' '}
                <span className="text-indigo-300">Libre</span> o <span className="text-orange-300">Reserva</span>.{' '}
                <span className="text-teal-300">Venta</span> no se devuelve aquí.
              </p>
              <button
                type="button"
                disabled={!reserveEnabled || !passport.trim() || !passengerName.trim()}
                onClick={() => onSubmit('reserva')}
                className="mt-6 w-full rounded-2xl border-2 border-yellow-400/70 bg-yellow-400/15 py-3 text-sm font-bold text-yellow-50 transition hover:bg-yellow-400/25 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Reservar
              </button>
              <button
                type="button"
                disabled={!purchaseEnabled || !passport.trim() || !passengerName.trim()}
                onClick={() => onSubmit('compra')}
                className="mt-3 w-full rounded-2xl border-2 border-emerald-400/80 bg-emerald-500/20 py-3 text-sm font-bold text-emerald-50 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Comprar (venta)
              </button>
            </div>
          </aside>
        </section>
      ) : null}

      {/* --- Paso 5 --- */}
      {step === 5 && boardingRecord && (
        <section className="mx-auto max-w-2xl space-y-8">
          <BoardingPassCard 
            record={boardingRecord} 
            brandName={brand.name} 
            brandShort={brand.shortName} 
            onSimulateScan={handleWalletScan} 
          />
          <div className="flex flex-col items-center gap-4">
            {isScanningWallet && (
              <div className="flex w-full max-w-md items-center justify-center gap-3 text-teal-400 font-bold bg-slate-800 px-6 py-4 border border-teal-500/30 rounded-2xl shadow-lg mt-4">
                <span className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                Detección exitosa. Sincronizando validación...
              </div>
            )}
            <button
              type="button"
              onClick={onNewSearch}
              className="w-full max-w-md rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-400 px-8 py-4 text-base font-black text-slate-950 shadow-xl shadow-teal-900/30 transition hover:brightness-110 active:scale-[0.99]"
            >
              Hecho — volver al inicio
            </button>
          </div>
        </section>
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
            <h3 className="text-2xl font-bold text-white mb-2">¡Escaneado Exitoso!</h3>
            <p className="text-slate-400 text-sm mb-6">
              El pasaje fue detectado e ingresado correctamente a tu Wallet.
            </p>
            <p className="text-xs text-teal-400 animate-pulse font-semibold mt-2 mb-6">
              Volviendo al inicio automáticamente...
            </p>
            
            <button
              onClick={() => {
                  setIsWalletModalOpen(false);
                  if (boardingRecord) downloadWalletDemoJson(boardingRecord);
                  // Después de descargar el JSON, vamos al inicio
                  setTimeout(() => onNewSearch(), 500);
              }}
              className="w-full rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-3 font-bold transition-colors"
            >
              Descargar JSON de Demo
            </button>
            <button
              onClick={() => {
                setIsWalletModalOpen(false);
                onNewSearch();
              }}
              className="w-full mt-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 font-bold transition-colors"
            >
              Cerrar y volver al inicio
            </button>
          </div>
        </div>
      )}

      {/* Modal de Mapa Interactivo */}
      {isMapExpanded && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200" onClick={() => setIsMapExpanded(false)}>
          <div className="w-full max-w-7xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsMapExpanded(false)} className="absolute -top-12 right-0 bg-slate-800/80 text-white font-bold px-4 py-2 hover:bg-slate-700/80 rounded-full transition-colors">
              Cerrar Interfaz de Mapa
            </button>
            <RouteMap cities={cities} origin={origin} destination={destination} selectedRoute={mapDisplayRoute} className="w-full shadow-2xl ring-2 ring-cyan-500/20" />
          </div>
        </div>
      )}
    </div>
  );
}
