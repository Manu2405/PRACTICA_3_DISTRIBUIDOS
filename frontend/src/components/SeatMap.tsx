import type { SeatStateType } from '../types';
import { isSeatSelectable } from '../utils';

type SeatMapProps = {
  seatMatrix: string[][];
  seatState: Record<string, SeatStateType>;
  selectedSeat: string | null;
  onSelectSeat: (seat: string) => void;
};

const stateStyles: Record<SeatStateType, string> = {
  free:
    'cursor-pointer border-indigo-300 bg-indigo-500 text-white shadow-sm shadow-indigo-950/50 hover:brightness-110 hover:ring-2 hover:ring-indigo-200',
  reserved:
    'cursor-not-allowed border-orange-400 bg-orange-500/35 text-orange-50 ring-1 ring-orange-400/60',
  sold: 'cursor-not-allowed border-teal-400 bg-teal-600/90 text-teal-50 shadow-sm shadow-teal-950/30',
  refund:
    'cursor-not-allowed border-rose-400 bg-rose-600/40 text-rose-50 ring-1 ring-rose-300/50 animate-pulse',
};

export default function SeatMap({ seatMatrix, seatState, selectedSeat, onSelectSeat }: SeatMapProps) {
  return (
    <div className="relative md:px-8">
      <div className="mx-auto w-full max-w-sm flex flex-col items-center">
        {/* Cockpit / WC */}
        <div className="w-1/2 h-14 bg-slate-800 rounded-t-[100px] flex flex-col items-center justify-center border-t-[6px] border-slate-700 shadow-inner mb-px">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cabina Vuelo</span>
        </div>
        <div className="w-full bg-slate-800 p-2 flex justify-between border-y border-slate-700/50 mb-1 rounded-t-xl">
          <div className="text-[9px] text-slate-400 uppercase font-bold flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-0.5"><path d="M7 3v18" /><path d="M12 9A6 6 0 0 0 6 3h-1" /><path d="M11 16H8" /><path d="M17 2v20" /><path d="M15 16h3" /></svg>
            WC Frontal
          </div>
          <div className="text-[9px] text-slate-400 uppercase font-bold flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-0.5"><path d="M7 3v18" /><path d="M12 9A6 6 0 0 0 6 3h-1" /><path d="M11 16H8" /><path d="M17 2v20" /><path d="M15 16h3" /></svg>
            WC Frontal
          </div>
        </div>

        {/* Fuselage wrapper */}
        <div className="w-full bg-slate-800/40 p-3 sm:p-4 border-x-[6px] border-slate-600 shadow-inner">
          <div className="mb-3 flex items-center justify-between text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 px-1">
            <span>Ventana</span>
            <span>Pasillo</span>
            <span>Ventana</span>
          </div>

          <div className="grid gap-2">
            {seatMatrix.map((row, rowIndex) => (
              <div key={rowIndex} className="space-y-2">
                {rowIndex === 3 && (
                  <div className="w-full flex justify-between items-center my-4 text-slate-500 text-[10px] uppercase font-bold whitespace-nowrap bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22v-8c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v8" /><path d="M4 12V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8" /><path d="M11 6h4l1.5-3A2 2 0 0 1 18.2 2H20v14a2 2 0 0 1-2 2h-1M12 2A2 2 0 0 0 10 4" /></svg>
                      Ala Izq (Tanque)
                    </div>
                    <div className="flex items-center gap-1.5 opacity-40">Salidas Emergencia</div>
                    <div className="flex items-center gap-1.5">
                      Ala Der (Tanque)
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22v-8c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v8" /><path d="M4 12V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8" /><path d="M11 6h4l1.5-3A2 2 0 0 1 18.2 2H20v14a2 2 0 0 1-2 2h-1M12 2A2 2 0 0 0 10 4" /></svg>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-6 gap-2">
                  {row.map((seat) => {
                    const state = seatState[seat] ?? 'free';
                    const selectable = isSeatSelectable(state);
                    const isSelected = selectedSeat === seat;
                    const base = stateStyles[state];
                    const selectedRing = isSelected && selectable ? ' ring-2 ring-white ring-offset-2 ring-offset-slate-900 border-white' : '';

                    return (
                      <button
                        type="button"
                        key={seat}
                        disabled={!selectable}
                        title={`${seat}: ${state}`}
                        onClick={() => onSelectSeat(seat)}
                        className={`rounded-xl border px-1 py-3 text-[10px] sm:text-xs font-bold transition-all duration-150 active:scale-95 flex items-center justify-center ${base}${selectedRing}`}
                      >
                        {seat}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cargo and Rear WC */}
        <div className="w-full bg-slate-800 p-2 flex justify-center border-b border-slate-700/50 mt-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold flex gap-2 items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.3 7l8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
            Bodega de Carga Inferior
          </div>
        </div>

        <div className="w-full bg-slate-800 p-2 flex justify-between rounded-b-xl border-t border-slate-700/50">
          <div className="text-[9px] text-slate-400 uppercase font-bold flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-0.5"><path d="M7 3v18" /><path d="M12 9A6 6 0 0 0 6 3h-1" /><path d="M11 16H8" /><path d="M17 2v20" /><path d="M15 16h3" /></svg>
            WC Trasero
          </div>
          <div className="text-[9px] text-slate-400 uppercase font-bold flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-0.5"><path d="M7 3v18" /><path d="M12 9A6 6 0 0 0 6 3h-1" /><path d="M11 16H8" /><path d="M17 2v20" /><path d="M15 16h3" /></svg>
            WC Trasero
          </div>
        </div>

        {/* Tail */}
        <div className="w-3/4 h-12 bg-slate-800 rounded-b-[60px] text-slate-600 text-[10px] font-bold tracking-widest uppercase flex items-end justify-center pb-2 mt-px border-b-[4px] border-slate-700">
          Cola / Tail
        </div>
      </div>
    </div>
  );
}

const swatch: Record<SeatStateType, string> = {
  free: 'border-indigo-300 bg-indigo-500',
  reserved: 'border-orange-400 bg-orange-500/50',
  sold: 'border-teal-400 bg-teal-600',
  refund: 'border-rose-400 bg-rose-600/60',
};

export function SeatStateLegend() {
  const items: { state: SeatStateType; label: string; hint: string }[] = [
    { state: 'free', label: 'Libre', hint: 'Índigo — disponible para reserva o venta' },
    { state: 'reserved', label: 'Reserva', hint: 'Naranja — bloqueado hasta compra o devolución' },
    { state: 'sold', label: 'Venta', hint: 'Verde azulado — vendido (sin devolución en esta demo)' },
    { state: 'refund', label: 'Devolución', hint: 'Rosa/rojo — en cola; vuelve a libre tras proceso simulado' },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(({ state, label, hint }) => (
        <div
          key={state}
          className="flex items-start gap-3 rounded-2xl bg-slate-800/60 px-3 py-2 ring-1 ring-white/5"
          title={hint}
        >
          <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-md border-2 ${swatch[state]}`} />
          <div>
            <p className="text-sm font-semibold text-slate-100">{label}</p>
            <p className="text-xs text-slate-500">{hint}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
