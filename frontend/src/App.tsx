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
  generateSeatMatrixForPlane,
  getPlaneColumns,
} from './data';
import type { BoardingRecord, CustomerStep, SeatStateType, Language } from './types';
import { canPurchase, canReserve } from './utils';
import { translations } from './i18n';
import CustomerView from './components/CustomerView';
import AdminView from './components/AdminView';
import BrandMark from './components/BrandMark';
import { fetchAdminDashboard, fetchRutasBackend, fetchAsientos, postOperacion, postVectorClock } from './api';
import type { ApiAdminDashboardResponse } from './api-contract';

function toUiSeatCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/[\s_-]+/g, '');
  const byColThenRow = cleaned.match(/^([A-Z])0*(\d+)$/);
  const byRowThenCol = cleaned.match(/^0*(\d+)([A-Z])$/);

  if (byColThenRow) return `${byColThenRow[1]}${Number(byColThenRow[2])}`;
  if (byRowThenCol) return `${byRowThenCol[2]}${Number(byRowThenCol[1])}`;
  return null;
}

function getSeatAliases(raw: string): string[] {
  const ui = toUiSeatCode(raw);
  if (!ui) return [raw.trim().toUpperCase()];

  const m = ui.match(/^([A-Z])(\d+)$/);
  if (!m) return [ui];

  const col = m[1];
  const row = m[2];
  return [ui, `${row}${col}`];
}

function buildSeatMatrixFromDbSeatIds(dbSeatMap: Record<string, number>): {
  seatMatrix: string[][];
  columns: number;
} {
  const rowToCols = new Map<number, Set<string>>();

  for (const key of Object.keys(dbSeatMap)) {
    const ui = toUiSeatCode(key);
    if (!ui) continue;

    const m = ui.match(/^([A-Z])(\d+)$/);
    if (!m) continue;

    const col = m[1];
    const row = Number(m[2]);

    if (!rowToCols.has(row)) rowToCols.set(row, new Set<string>());
    rowToCols.get(row)!.add(col);
  }

  const rows = Array.from(rowToCols.keys()).sort((a, b) => a - b);
  const seatMatrix = rows.map((row) => {
    const cols = Array.from(rowToCols.get(row) ?? []).sort((a, b) => a.localeCompare(b));
    return cols.map((col) => `${col}${row}`);
  });
  const columns = seatMatrix.reduce((max, row) => Math.max(max, row.length), 0);

  return { seatMatrix, columns };
}

function App() {
  const refundTimers = useRef<Record<string, number>>({});
  const reservationExpiryTimers = useRef<Record<string, number>>({});
  const reservedSeatsRef = useRef<Set<string>>(new Set());

  const markReservationTimestamp = (seatId: string) => {
    setReserveTimestamps((prev) => ({ ...prev, [seatId]: Date.now() }));
  };

  const clearReservationTimestamp = (seatId: string) => {
    setReserveTimestamps((prev) => {
      if (!(seatId in prev)) return prev;
      const next = { ...prev };
      delete next[seatId];
      return next;
    });
  };

  const scheduleRefundToFree = (seatId: string) => {
    if (refundTimers.current[seatId]) {
      window.clearTimeout(refundTimers.current[seatId]);
    }

    refundTimers.current[seatId] = window.setTimeout(() => {
      setLiveSeatState((p) => (p[seatId] === 'refund' ? { ...p, [seatId]: 'free' } : p));
      delete refundTimers.current[seatId];
    }, 5000);
  };

  const extractClock = (clockResponse: any, nodeId: string): string => {
    const raw =
      clockResponse?.reloj ??
      clockResponse?.clock ??
      clockResponse?.vector ??
      clockResponse?.evento?.reloj ??
      clockResponse?.evento?.clock ??
      null;

    if (!raw) {
      return JSON.stringify({
        [nodeId]: Date.now(),
      });
    }

    return JSON.stringify(raw);
  };

  const generarRelojVector = async (nodeId: string): Promise<string> => {
    try {
      const clockResponse = await postVectorClock(nodeId);
      return extractClock(clockResponse, nodeId);
    } catch {
      return extractClock(null, nodeId);
    }
  };

  const scheduleReservationExpiry = (seatId: string, dbSeatId: number) => {
    if (reservationExpiryTimers.current[seatId]) {
      window.clearTimeout(reservationExpiryTimers.current[seatId]);
    }

    reservationExpiryTimers.current[seatId] = window.setTimeout(async () => {
      if (!reservedSeatsRef.current.has(seatId)) return;

      try {
        const relojVector = await generarRelojVector('NODO_MANU');

        const result = await postOperacion('anulaciones', {
          asientoId: dbSeatId,
          pasajeroId: 1,
          motivo: 'RESERVA_EXPIRADA',
          tipo: 'RESERVA',
          nodoOrigen: 'NODO_MANU',
          relojVector,
        });

        if (!result.ok) {
          throw new Error(result.data?.message ?? 'No se pudo expirar reserva');
        }
      } catch (e) {
        console.error('Error expirando reserva', e);
        return;
      }

      setLiveSeatState((prev) => ({ ...prev, [seatId]: 'free' }));
      setSessionReservedSeats((prev) => {
        const next = new Set(prev);
        next.delete(seatId);
        return next;
      });
      clearReservationTimestamp(seatId);

      if (selectedSeat === seatId) {
        setSelectedSeat(null);
      }

      showFeedback(
        lang === 'es'
          ? 'La reserva expiró y el asiento volvió a estar disponible.'
          : 'Reservation expired and the seat is available again.',
        'success'
      );

      delete reservationExpiryTimers.current[seatId];
    }, 60000); // 1 minuto
  };

  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [lang, setLang] = useState<Language>('es');
  const [customerStep, setCustomerStep] = useState<CustomerStep>(1);
  const [purchaseLocation, setPurchaseLocation] = useState<string>(purchaseLocations[0].code);
  const [passport, setPassport] = useState('42152');
  const [passengerName, setPassengerName] = useState('Juanito Pérez');
  const [boardingRecord, setBoardingRecord] = useState<BoardingRecord | null>(null);
  const [sessionReservedSeats, setSessionReservedSeats] = useState<Set<string>>(() => new Set());
  const [reserveTimestamps, setReserveTimestamps] = useState<Record<string, number>>({});
  const [searchId, setSearchId] = useState(0);

  const [origin, setOrigin] = useState('ATL');
  const [destination, setDestination] = useState('LON');
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [liveSeatState, setLiveSeatState] = useState<Record<string, SeatStateType>>({});
  const [dbSeatIds, setDbSeatIds] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  const [adminDashboard, setAdminDashboard] = useState<ApiAdminDashboardResponse | null>(null);

  const t = translations[lang];

  useEffect(() => {
    reservedSeatsRef.current = sessionReservedSeats;
  }, [sessionReservedSeats]);

  useEffect(() => {
    const loadSeats = async () => {
      const seatObj = await fetchAsientos(1);

      setLiveSeatState((prev) => {
        const next = { ...prev };
        const newDbIds: Record<string, number> = {};

        for (const k in seatObj) {
          if (k.startsWith('_db_id_')) {
            newDbIds[k.replace('_db_id_', '')] = seatObj[k] as unknown as number;
          } else {
            next[k] = seatObj[k] as SeatStateType;
          }
        }

        setDbSeatIds((d) => ({ ...d, ...newDbIds }));
        return next;
      });
    };

    loadSeats(); // carga inicial inmediata

    const interval = setInterval(loadSeats, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchRutasBackend(origin, destination).then((data) => {
      const mappedRoutes = data.map((apiOffer) => ({
        path: apiOffer.path,
        type: apiOffer.kind as 'Directa' | 'Escala',
        economy: apiOffer.economyUsd,
        first: apiOffer.firstUsd,
        time: apiOffer.durationHours,
        flight: apiOffer.flightCodes,
        airline: apiOffer.airline,
        plane: apiOffer.aircraft,
        gate: apiOffer.gate,
        departure: apiOffer.departureLocal,
        arrival: apiOffer.arrivalLocal,
        status: 'On Time' as const,
      }));

      setRouteOptions(mappedRoutes);
      setSelectedRouteIndex(0);
    });
  }, [origin, destination, searchId]);

  useEffect(() => {
    let alive = true;

    if (view !== 'admin') {
      return () => {
        alive = false;
      };
    }

    fetchAdminDashboard().then((data) => {
      if (!alive) return;
      setAdminDashboard(data);
    });

    return () => {
      alive = false;
    };
  }, [view]);

  const selectedRoute = routeOptions[selectedRouteIndex] ?? null;
  const sessionReservedList = useMemo(() => Array.from(sessionReservedSeats), [sessionReservedSeats]);
  const backendSeatLayout = useMemo(() => buildSeatMatrixFromDbSeatIds(dbSeatIds), [dbSeatIds]);

  const resolveDbSeatId = (seatCode: string): number | undefined => {
    for (const key of getSeatAliases(seatCode)) {
      if (dbSeatIds[key]) return dbSeatIds[key];
    }
    return undefined;
  };

  const { currentSeatMatrix, firstClassSeats, columns } = useMemo(() => {
    if (backendSeatLayout.seatMatrix.length > 0) {
      const planeModel = selectedRoute?.plane?.split(' / ')[0] || 'A320';
      const ac = aircrafts.find((a) => a.model === planeModel) || aircrafts[0];

      return {
        currentSeatMatrix: backendSeatLayout.seatMatrix,
        firstClassSeats: ac.first,
        columns: backendSeatLayout.columns || 6,
      };
    }

    if (!selectedRoute) {
      return {
        currentSeatMatrix: generateSeatMatrixForPlane(60, 6),
        firstClassSeats: 12,
        columns: 6,
      };
    }

    const planeModel = selectedRoute.plane?.split(' / ')[0] || 'A320';
    const cols = getPlaneColumns(planeModel);
    const ac = aircrafts.find((a) => a.model === planeModel) || aircrafts[0];

    return {
      currentSeatMatrix: generateSeatMatrixForPlane(ac.first + ac.economy, cols),
      firstClassSeats: ac.first,
      columns: cols,
    };
  }, [selectedRoute, backendSeatLayout]);

  const showFeedback = (message: string, variant: 'success' | 'error') => {
    setFeedback({ message, variant });
    window.setTimeout(() => setFeedback(null), variant === 'error' ? 5500 : 7500);
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

  const handleNewSearch = () => {
    setSearchId((s) => s + 1);
    resetCustomerFlow();
  };

  const handleSubmit = async (action: 'reserva' | 'compra') => {
    if (origin === destination) {
      showFeedback(
        lang === 'es' ? 'Elige origen y destino distintos.' : 'Choose different origin and destination.',
        'error'
      );
      return;
    }

    if (!selectedRoute) {
      showFeedback(lang === 'es' ? 'No hay ruta disponible.' : 'No route available.', 'error');
      return;
    }

    if (!selectedSeat) {
      showFeedback(
        lang === 'es'
          ? 'Selecciona un asiento libre o tu reserva.'
          : 'Select a free seat or your reservation.',
        'error'
      );
      return;
    }

    if (!passport.trim() || !passengerName.trim()) {
      showFeedback(
        lang === 'es' ? 'Completa pasaporte y nombre.' : 'Complete passport and name.',
        'error'
      );
      return;
    }

    const seat = selectedSeat;

    console.log('handleSubmit -> debug', {
      action,
      selectedSeat,
      seat,
      dbSeatId: resolveDbSeatId(seat),
      seatState: liveSeatState[seat],
      knownSeatKeys: Object.keys(dbSeatIds).slice(0, 20),
    });

    const dbSeatId = resolveDbSeatId(seat);
    if (!dbSeatId) {
      showFeedback(
        lang === 'es'
          ? 'No se pudo mapear el asiento seleccionado con la base de datos.'
          : 'Could not map selected seat to database record.',
        'error'
      );
      return;
    }

    const endpoint = action === 'reserva' ? 'reservas' : 'ventas';

    try {
      const relojVector = await generarRelojVector('NODO_MANU');

      const payload: any = {
        asientoId: dbSeatId,
        pasajeroId: 1,
        nodoOrigen: 'NODO_MANU',
        relojVector,
      };

      if (action === 'reserva') {
        payload.minutosExpiracion = 1;
      }

      const result = await postOperacion(endpoint, payload);

      if (!result.ok) {
        showFeedback(
          `Error ${result.status}: ${result.data?.message || 'Operación rechazada.'}`,
          'error'
        );
        return;
      }
    } catch (e) {
      showFeedback('Fallo de conexión.', 'error');
      return;
    }

    const now = new Date();

    if (action === 'reserva') {
      setShowReserveModal(true);
      setSessionReservedSeats((prev) => new Set(prev).add(seat));
      markReservationTimestamp(seat);
      setLiveSeatState((prev) => ({ ...prev, [seat]: 'reserved' }));
      scheduleReservationExpiry(seat, dbSeatId);
      return;
    }

    // Si se compró, cancela el timer de expiración de reserva
    if (reservationExpiryTimers.current[seat]) {
      window.clearTimeout(reservationExpiryTimers.current[seat]);
      delete reservationExpiryTimers.current[seat];
    }
    clearReservationTimestamp(seat);

    setLiveSeatState((prev) => ({ ...prev, [seat]: 'sold' }));
    setSessionReservedSeats((prev) => {
      const next = new Set(prev);
      next.delete(seat);
      return next;
    });

    const purchaseLocationLabel = purchaseLocations.find((p) => p.code === purchaseLocation)?.label;

    const record: BoardingRecord = {
      kind: 'compra',
      passengerName: passengerName.trim(),
      passport: passport.trim(),
      seat,
      flight: selectedRoute.flight || 'LB-1337',
      origin,
      destination,
      originLabel: cities.find((c) => c.code === origin)?.label ?? origin,
      destinationLabel: cities.find((c) => c.code === destination)?.label ?? destination,
      departure: selectedRoute.departure,
      arrival: selectedRoute.arrival,
      gate: selectedRoute.gate,
      travelClass: 'Y',
      localIssuedAt: now.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      }),
      flightDate: now.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      issuedAtISO: now.toISOString(),
      purchaseLocationLabel,
    };

    setBoardingRecord(record);
    setSelectedSeat(null);
    setFeedback(null);
    setCustomerStep(5);
  };

  const handleCancelReservation = async () => {
    if (!selectedSeat) return;
    if (!sessionReservedSeats.has(selectedSeat)) return;

    const seat = selectedSeat;
    const dbSeatId = resolveDbSeatId(seat);

    if (!dbSeatId) {
      showFeedback(
        lang === 'es'
          ? 'No se pudo mapear el asiento para anular la reserva.'
          : 'Could not map seat to cancel reservation.',
        'error'
      );
      return;
    }

    try {
      const relojVector = await generarRelojVector('NODO_MANU');

      const result = await postOperacion('anulaciones', {
        asientoId: dbSeatId,
        pasajeroId: 1,
        motivo: 'CANCEL_BY_USER',
        tipo: 'RESERVA',
        nodoOrigen: 'NODO_MANU',
        relojVector,
      });

      if (!result.ok) {
        showFeedback(
          `Error ${result.status}: ${result.data?.message || 'Operación rechazada.'}`,
          'error'
        );
        return;
      }
    } catch (e) {
      console.error(e);
      showFeedback('Fallo de conexión.', 'error');
      return;
    }

    if (reservationExpiryTimers.current[seat]) {
      window.clearTimeout(reservationExpiryTimers.current[seat]);
      delete reservationExpiryTimers.current[seat];
    }
    clearReservationTimestamp(seat);

    setLiveSeatState((prev) => ({ ...prev, [seat]: 'refund' }));
    setSessionReservedSeats((prev) => {
      const next = new Set(prev);
      next.delete(seat);
      return next;
    });

    scheduleRefundToFree(seat);
    setSelectedSeat(null);

    showFeedback(
      lang === 'es' ? 'Reserva anulada' : 'Reservation cancelled',
      'success'
    );
  };

  const handleCancelPurchase = async (seatId: string) => {
    const dbSeatId = resolveDbSeatId(seatId);

    if (!dbSeatId) {
      showFeedback(
        lang === 'es'
          ? 'No se pudo mapear el asiento para anular la compra.'
          : 'Could not map seat to cancel purchase.',
        'error'
      );
      return;
    }

    try {
      const relojVector = await generarRelojVector('NODO_MANU');

      const result = await postOperacion('anulaciones', {
        asientoId: dbSeatId,
        pasajeroId: 1,
        motivo: 'CANCEL_BY_USER',
        tipo: 'VENTA',
        nodoOrigen: 'NODO_MANU',
        relojVector,
      });

      if (!result.ok) {
        showFeedback(
          `Error ${result.status}: ${result.data?.message || 'Operación rechazada.'}`,
          'error'
        );
        return;
      }
    } catch (e) {
      console.error(e);
      showFeedback('Fallo de conexión.', 'error');
      return;
    }

    if (reservationExpiryTimers.current[seatId]) {
      window.clearTimeout(reservationExpiryTimers.current[seatId]);
      delete reservationExpiryTimers.current[seatId];
    }
    clearReservationTimestamp(seatId);

    setLiveSeatState((prev) => ({ ...prev, [seatId]: 'refund' }));
    setBoardingRecord(null);
    setCustomerStep(1);
    scheduleRefundToFree(seatId);

    showFeedback(
      lang === 'es'
        ? 'Compra anulada. Sincronizando...'
        : 'Purchase cancelled. Syncing...',
      'success'
    );
  };

  return (
    <div className="app-shell">
      <div className="app-shell-inner min-h-screen px-4 py-8 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <BrandMark
              name={t.brand_name}
              tagline={t.brand_tagline}
              shortName={BRAND.shortName}
              iconSrc={BRAND.iconImage}
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-3xl border border-white/10 bg-slate-900/80 p-1.5 shadow-xl backdrop-blur-md">
                {(['es', 'en', 'pt'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    className={`rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                      lang === code
                        ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    aria-pressed={lang === code}
                  >
                    {code}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-3xl border border-white/10 bg-slate-900/80 p-1.5 shadow-xl backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setView('customer')}
                  className={`rounded-2xl px-6 py-3 text-sm font-bold transition-all ${view === 'customer'
                    ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {t.customer}
                </button>

                <button
                  type="button"
                  onClick={() => setView('admin')}
                  className={`rounded-2xl px-6 py-3 text-sm font-bold transition-all ${view === 'admin'
                    ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25'
                    : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {t.admin}
                </button>
              </div>
            </div>
          </header>

          {view === 'customer' ? (
            <CustomerView
              lang={lang}
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
              seatMatrix={currentSeatMatrix}
              firstClassSeats={firstClassSeats}
              seatState={liveSeatState}
              selectedSeat={selectedSeat}
              setSelectedSeat={setSelectedSeat}
              passport={passport}
              setPassport={setPassport}
              passengerName={passengerName}
              setPassengerName={setPassengerName}
              sessionReservedSeats={sessionReservedList}
              reserveTimestamps={reserveTimestamps}
              onCancelReservation={handleCancelReservation}
              onCancelPurchase={handleCancelPurchase}
              onSubmit={handleSubmit}
              feedback={feedback}
              boardingRecord={boardingRecord}
              onNewSearch={handleNewSearch}
              columns={columns}
            />
          ) : (
            <AdminView
              lang={lang}
              nodeStatuses={nodeStatuses}
              conflicts={conflicts}
              eventLogs={eventLogs}
              aircrafts={aircrafts}
              dashboard={adminDashboard}
              brandShort={BRAND.shortName}
              brandName={t.brand_name}
            />
          )}
        </div>
      </div>

      {showReserveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-2">{t.reserved}</h3>
            <p className="text-slate-400 mb-8">
              {lang === 'es'
                ? 'Tu reserva qued? activa por 1 minuto. Puedes completar la compra o dejar que expire.'
                : lang === 'en'
                  ? 'Your reservation is active for 1 minute. You can complete the purchase or let it expire.'
                  : 'Sua reserva ficou ativa por 1 minuto. Voc? pode concluir a compra ou deix?-la expirar.'}
            </p>
            <button
              onClick={() => setShowReserveModal(false)}
              className="w-full bg-cyan-500 py-3 rounded-xl text-black"
            >
              {lang === 'en' ? 'Continue' : 'Continuar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
