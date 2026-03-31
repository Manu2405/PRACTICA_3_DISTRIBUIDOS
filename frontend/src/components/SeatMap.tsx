import { useState, useMemo } from 'react';
import { Language, SeatStateType } from '../types';
import { isSeatSelectable } from '../utils';
import { translations } from '../i18n';

type SeatMapProps = {
  lang: Language;
  seatMatrix: string[][];
  seatState: Record<string, SeatStateType>;
  selectedSeat: string | null;
  onSelectSeat: (seat: string) => void;
  firstClassSeats: number;
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

export default function SeatMap({ lang, seatMatrix, seatState, selectedSeat, onSelectSeat, firstClassSeats }: SeatMapProps) {
  const t = translations[lang];
  const firstClassRows = Math.ceil(firstClassSeats / 6);
  const totalRows = seatMatrix.length;
  
  // Section distribution
  const [currentSection, setCurrentSection] = useState<'front' | 'middle' | 'rear'>('front');

  const visibleRows = useMemo(() => {
    const segment = Math.ceil(totalRows / 3);
    if (currentSection === 'front') return seatMatrix.slice(0, segment);
    if (currentSection === 'middle') return seatMatrix.slice(segment, segment * 2);
    return seatMatrix.slice(segment * 2);
  }, [currentSection, seatMatrix, totalRows]);

  const sectionStartIndex = useMemo(() => {
    const segment = Math.ceil(totalRows / 3);
    if (currentSection === 'front') return 0;
    if (currentSection === 'middle') return segment;
    return segment * 2;
  }, [currentSection, totalRows]);

  return (
    <div className="relative md:px-8 animate-fade-in">
      {/* Section Switcher Tabs */}
      <div className="flex justify-center gap-1 mb-6 p-1.5 bg-slate-900/60 rounded-2xl border border-white/5 ring-1 ring-white/5 backdrop-blur-sm max-w-xs mx-auto">
         {(['front', 'middle', 'rear'] as const).map((s) => (
            <button
               key={s}
               onClick={() => setCurrentSection(s)}
               className={`flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                  currentSection === s 
                  ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20' 
                  : 'text-slate-500 hover:text-slate-300'
               }`}
            >
               {(t as any)[s]}
            </button>
         ))}
      </div>

      <div className="mx-auto w-full max-w-sm flex flex-col items-center">
        {/* Cockpit / Front Service Area (Only in Front section) */}
        {currentSection === 'front' && (
          <div className="w-1/2 h-14 bg-slate-800 rounded-t-[100px] flex flex-col items-center justify-end border-t-[6px] border-slate-700 shadow-inner pb-2 relative overflow-hidden animate-fade-in-down">
             <div className="absolute top-2 w-full flex justify-center gap-1 opacity-20">
                <div className="w-6 h-4 bg-cyan-400 rounded-sm skew-x-[-20deg]" />
                <div className="w-8 h-5 bg-cyan-400 rounded-sm" />
                <div className="w-6 h-4 bg-cyan-400 rounded-sm skew-x-[20deg]" />
             </div>
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{lang === 'es' ? 'Cabina' : lang === 'en' ? 'Cockpit' : 'Cabine'}</span>
             <div className="absolute -bottom-1 w-full text-center">
                <span className="text-[6px] font-black text-cyan-400/40 uppercase tracking-[0.3em] truncate px-4 block">
                   {translations[lang].aircraft}
                </span>
             </div>
          </div>
        )}

        {/* Fuselage wrapper */}
        <div className={`w-full bg-slate-800/40 p-4 border-x-[6px] border-slate-600 shadow-inner relative transition-all duration-500 ${currentSection === 'front' ? 'rounded-t-2xl' : currentSection === 'rear' ? 'rounded-b-2xl' : ''}`}>
          
          {/* Wings (Only in Middle section) */}
          {currentSection === 'middle' && (
            <>
              <div className="absolute -left-24 top-1/2 -translate-y-1/2 w-24 h-64 pointer-events-none hidden md:block animate-fade-in-left">
                 <div className="w-full h-full bg-gradient-to-r from-transparent via-slate-700/30 to-slate-600/70" 
                      style={{ clipPath: 'polygon(100% 25%, 0% 100%, 100% 75%)' }} />
              </div>
              <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-24 h-64 pointer-events-none hidden md:block animate-fade-in-right">
                 <div className="w-full h-full bg-gradient-to-l from-transparent via-slate-700/30 to-slate-600/70" 
                      style={{ clipPath: 'polygon(0% 25%, 100% 100%, 0% 75%)' }} />
              </div>
            </>
          )}

          <div className="grid gap-2 pr-1">
            {visibleRows.map((row, relativeIndex) => {
              const rowIndex = sectionStartIndex + relativeIndex;
              const isFirstClass = rowIndex < firstClassRows;
              return (
                <div key={rowIndex} className="space-y-2">
                  {rowIndex === 0 && isFirstClass && (
                    <div className="text-center py-2 text-[9px] uppercase font-black text-amber-500/80 tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                      <span className="h-px w-8 bg-amber-500/20" />
                      {t.first_class}
                      <span className="h-px w-8 bg-amber-500/20" />
                    </div>
                  )}
                  {rowIndex === firstClassRows && (
                    <div className="text-center py-2 text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] mb-2 mt-4 flex items-center justify-center gap-2">
                      <span className="h-px w-8 bg-slate-700/40" />
                      {t.economy}
                      <span className="h-px w-8 bg-slate-700/40" />
                    </div>
                  )}
                  <div className="grid grid-cols-6 gap-2">
                    {row.map((seat) => {
                      const state = seatState[seat] ?? 'free';
                      const selectable = isSeatSelectable(state);
                      const isSelected = selectedSeat === seat;
                      
                      const base = stateStyles[state];
                      const selectedRing = isSelected && selectable ? ' ring-2 ring-white ring-offset-[3px] ring-offset-slate-900 border-white scale-110 z-10' : '';

                      return (
                        <button
                          type="button"
                          key={seat}
                          disabled={!selectable}
                          title={`${seat}: ${state}`}
                          onClick={() => onSelectSeat(seat)}
                          className={`group relative rounded-xl border px-1 py-3 text-[10px] sm:text-xs font-black transition-all duration-200 active:scale-90 flex items-center justify-center ${base}${selectedRing}`}
                        >
                          {/* Premium Indicator for First Class (Subtle Diamond) */}
                          {isFirstClass && state === 'free' && (
                            <svg className="absolute -top-1 -right-1 w-3 h-3 text-amber-400 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          )}
                          <span className={isFirstClass ? 'text-white' : ''}>{seat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tail (Only in Rear section) */}
        {currentSection === 'rear' && (
          <div className="w-3/4 h-10 bg-slate-800 rounded-b-[60px] flex items-end justify-center pb-2 mt-px border-b-[4px] border-slate-700 animate-fade-in-up" />
        )}
      </div>
    </div>
  );
}

export function SeatStateLegend({ lang }: { lang: Language }) {
  const t = translations[lang];
  const items: { color: string; label: string; icon?: boolean }[] = [
    { color: 'bg-indigo-500', label: t.free_economy },
    { color: 'bg-indigo-500', label: t.free_first, icon: true },
    { color: 'bg-orange-500/50', label: t.reservations },
    { color: 'bg-teal-600', label: t.seats_sold.split(' ')[0] },
    { color: 'bg-rose-600/50', label: lang === 'es' ? 'Devolución' : lang === 'en' ? 'Refund' : 'Reembolso' },
  ];

  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
      {items.map(({ color, label, icon }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 border border-white/5 shadow-sm"
        >
          <div className="relative">
            <span className={`block h-3 w-3 rounded-full ${color}`} />
            {icon && (
               <svg className="absolute -top-1 -right-1 w-2.5 h-2.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
               </svg>
            )}
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-tight">{label}</p>
        </div>
      ))}
    </div>
  );
}
