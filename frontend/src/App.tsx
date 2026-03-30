import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BRAND,
  aircrafts,
  cities,
  cityTimezones,
  conflicts,
  eventLogs,
  initialSeatState,
  mockPassengers,
  nodeStatuses,
  purchaseLocations,
  seatMatrix,
} from './data';
import type { BoardingRecord, CustomerStep, SeatStateType } from './types';
import { canPurchase, canReserve, computeRoutes } from './utils';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';
import BrandMark from './components/BrandMark';

function App() {
  const refundTimers = useRef<Record<string, number>>({});

  const scheduleRefundToFree = (seatId: string) => {
    if (refundTimers.current[seatId]) {
      window.clearTimeout(refundTimers.current[seatId]);
    }
    refundTimers.current[seatId] = window.setTimeout(() => {
      setLiveSeatState((p) => (p[seatId] === 'refund' ? { ...p, [seatId]: 'free' } : p));
      delete refundTimers.current[seatId];
    }, 8000);
  };

  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [customerStep, setCustomerStep] = useState<CustomerStep>(1);
  const [purchaseLocation, setPurchaseLocation] = useState<string>(purchaseLocations[0].code);
  const [passport, setPassport] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [boardingRecord, setBoardingRecord] = useState<BoardingRecord | null>(null);
  const [sessionReservedSeats, setSessionReservedSeats] = useState<Set<string>>(() => new Set());

  const [origin, setOrigin] = useState('ATL');
  const [destination, setDestination] = useState('LON');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [liveSeatState, setLiveSeatState] = useState<Record<string, SeatStateType>>(initialSeatState);
  const [feedback, setFeedback] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);

  const routeOptions = useMemo(() => computeRoutes(origin, destination), [origin, destination]);
  const selectedRoute = routeOptions[selectedRouteIndex] ?? null;
  const sessionReservedList = useMemo(() => [...sessionReservedSeats], [sessionReservedSeats]);

  useEffect(() => {
    setSelectedRouteIndex((idx) => {
      if (routeOptions.length === 0) return 0;
      return Math.min(idx, routeOptions.length - 1);
    });
  }, [routeOptions]);

  useEffect(() => {
    const init = initialSeatState();
    Object.entries(init)
      .filter(([, s]) => s === 'refund')
      .forEach(([id]) => scheduleRefundToFree(id));
    return () => {
      Object.values(refundTimers.current).forEach((t) => window.clearTimeout(t));
      refundTimers.current = {};
    };
  }, []);

  const showFeedback = (message: string, variant: 'success' | 'error') => {
    setFeedback({ message, variant });
    window.setTimeout(() => setFeedback(null), variant === 'error' ? 5500 : 6500);
  };

  const resetCustomerFlow = () => {
    setCustomerStep(1);
    setBoardingRecord(null);
    setSelectedSeat(null);
    setSelectedRouteIndex(0);
    setFeedback(null);
  };

  const setOriginSafe = (code: string) => {
    setOrigin(code);
    setSelectedRouteIndex(0);
    setSelectedSeat(null);
    if (customerStep > 1) {
      setCustomerStep(1);
      setBoardingRecord(null);
    }
    if (code === destination) {
      const other = cities.find((c) => c.code !== code);
      if (other) setDestination(other.code);
    }
  };

  const setDestinationSafe = (code: string) => {
    setDestination(code);
    setSelectedRouteIndex(0);
    setSelectedSeat(null);
    if (customerStep > 1) {
      setCustomerStep(1);
      setBoardingRecord(null);
    }
    if (code === origin) {
      const other = cities.find((c) => c.code !== code);
      if (other) setOrigin(other.code);
    }
  };

  const handleSubmit = (action: 'reserva' | 'compra') => {
    if (origin === destination) {
      showFeedback('Elige origen y destino distintos.', 'error');
      return;
    }
    if (!selectedRoute) {
      showFeedback('No hay ruta disponible.', 'error');
      return;
    }
    if (!selectedSeat) {
      showFeedback('Selecciona un asiento libre (índigo) o, para comprar, uno en reserva tuya.', 'error');
      return;
    }
    if (!passport.trim() || !passengerName.trim()) {
      showFeedback('Completa pasaporte y nombre del pasajero.', 'error');
      return;
    }

    const seat = selectedSeat;
    const st = liveSeatState[seat] ?? 'free';
    if (action === 'reserva' && !canReserve(st)) {
      showFeedback('Solo puedes reservar en estado Libre.', 'error');
      return;
    }
    if (action === 'compra' && !canPurchase(st)) {
      showFeedback('Compra no disponible: elige Libre o tu Reserva (amarillo).', 'error');
      return;
    }
    if (action === 'reserva' && st === 'free') {
      setLiveSeatState((prev) => ({ ...prev, [seat]: 'reserved' }));
      setSessionReservedSeats((prev) => new Set(prev).add(seat));
      setShowReserveModal(true);
      return;
    }
    if (action === 'compra') {
      setLiveSeatState((prev) => ({ ...prev, [seat]: 'sold' }));
      setSessionReservedSeats((prev) => {
        const next = new Set(prev);
        next.delete(seat);
        return next;
      });
    }

    const purchaseLocationLabel = purchaseLocations.find((p) => p.code === purchaseLocation)?.label;
    const record: BoardingRecord = {
      kind: action === 'compra' ? 'compra' : 'reserva',
      passengerName: passengerName.trim(),
      passport: passport.trim(),
      seat,
      flight: selectedRoute.flight,
      origin,
      destination,
      originLabel: cities.find((c) => c.code === origin)?.label ?? origin,
      destinationLabel: cities.find((c) => c.code === destination)?.label ?? destination,
      departure: selectedRoute.departure,
      arrival: selectedRoute.arrival,
      gate: selectedRoute.gate,
      travelClass: action === 'compra' ? 'Y' : 'R',
      localIssuedAt: new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'medium' }),
      purchaseLocationLabel,
    };
    setBoardingRecord(record);
    setSelectedSeat(null);
    setFeedback(null);
    setCustomerStep(5);
  };

  const handleCancelReservation = () => {
    if (!selectedSeat) return;
    if (!sessionReservedSeats.has(selectedSeat)) return;
    if ((liveSeatState[selectedSeat] ?? 'free') !== 'reserved') return;
    const seat = selectedSeat;
    setLiveSeatState((prev) => ({ ...prev, [seat]: 'refund' }));
    setSessionReservedSeats((prev) => {
      const next = new Set(prev);
      next.delete(seat);
      return next;
    });
    scheduleRefundToFree(seat);
    setSelectedSeat(null);
    showFeedback('Reserva anulada: estado Devolución (rojo). Volverá a Libre tras proceso simulado (~8 s).', 'success');
  };

  return (
    <div className="app-shell">
      <div className="app-shell-inner min-h-screen px-4 py-8 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <BrandMark name={BRAND.name} shortName={BRAND.shortName} iconSrc={BRAND.iconImage} />
            <div className="inline-flex rounded-3xl border border-white/10 bg-slate-900/80 p-1.5 shadow-xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => setView('customer')}
                className={`rounded-2xl px-6 py-3 text-sm font-bold transition-all ${
                  view === 'customer'
                    ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => setView('admin')}
                className={`rounded-2xl px-6 py-3 text-sm font-bold transition-all ${
                  view === 'admin'
                    ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Administración
              </button>
            </div>
          </header>

          {view === 'customer' ? (
            <CustomerView
              brand={BRAND}
              cities={cities}
              purchaseLocations={purchaseLocations}
              cityTimezones={cityTimezones}
              mockPassengers={mockPassengers}
              step={customerStep}
              setStep={setCustomerStep}
              purchaseLocation={purchaseLocation}
              setPurchaseLocation={setPurchaseLocation}
              origin={origin}
              destination={destination}
              setOrigin={setOriginSafe}
              setDestination={setDestinationSafe}
              routeOptions={routeOptions}
              selectedRouteIndex={selectedRouteIndex}
              setSelectedRouteIndex={setSelectedRouteIndex}
              selectedRoute={selectedRoute}
              seatMatrix={seatMatrix}
              seatState={liveSeatState}
              selectedSeat={selectedSeat}
              setSelectedSeat={setSelectedSeat}
              passport={passport}
              setPassport={setPassport}
              passengerName={passengerName}
              setPassengerName={setPassengerName}
              sessionReservedSeats={sessionReservedList}
              onCancelReservation={handleCancelReservation}
              onSubmit={handleSubmit}
              feedback={feedback}
              boardingRecord={boardingRecord}
              onNewSearch={resetCustomerFlow}
            />
          ) : (
            <AdminView
              nodeStatuses={nodeStatuses}
              conflicts={conflicts}
              eventLogs={eventLogs}
              aircrafts={aircrafts}
              brandShort={BRAND.shortName}
              brandName={BRAND.name}
            />
          )}
        </div>
      </div>

      {showReserveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 ring-1 ring-white/10 shadow-2xl overflow-hidden text-center p-8 animate-in fade-in zoom-in-50 slide-in-from-bottom-10 duration-500 ease-out">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20 mb-6 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                <path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">¡Asiento Reservado!</h3>
            <p className="text-slate-400 text-sm mb-8">
              Tu asiento ha sido reservado con éxito. Si no lo compras, la reserva expirará pronto.
            </p>
            <button
              onClick={() => setShowReserveModal(false)}
              className="w-full rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-6 py-3 font-bold transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
