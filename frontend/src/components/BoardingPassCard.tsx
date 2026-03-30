import { QRCodeSVG } from 'qrcode.react';
import { boardingPassQrValue } from '../googleWalletMock';
import type { BoardingRecord } from '../types';

type BoardingPassCardProps = {
  record: BoardingRecord;
  brandName: string;
  brandShort: string;
};

function BarcodeBlock({ value }: { value: string }) {
  // Generate deterministic but random-looking bars
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  const str = Math.abs(hash).toString(16).repeat(10);
  const bars = str.slice(0, 50).split('').map((ch, i) => {
    const w = ((ch.codePointAt(0) ?? 0) % 4) + 1;
    return <div key={`${i}-${ch}`} className="shrink-0 bg-slate-800" style={{ width: w, height: 40 }} />;
  });
  return (
    <div className="w-full flex justify-center py-2">
      <div className="inline-flex items-end justify-center gap-[2px] overflow-hidden opacity-90">
        {bars}
      </div>
    </div>
  );
}

export default function BoardingPassCard({ record, brandName, brandShort }: BoardingPassCardProps) {
  const isSale = record.kind === 'compra';
  const stub = `${record.origin} → ${record.destination}`;
  const qrValue = boardingPassQrValue(record);

  return (
    <div className="rounded-3xl bg-[#e8e4dc] p-4 shadow-2xl ring-1 ring-black/10 sm:p-6">
      <div className="relative overflow-hidden rounded-2xl border border-[#0d9488]/40 bg-[#f5f2eb] shadow-inner">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 100'%3E%3Cpath fill='none' stroke='%230d9488' stroke-width='0.3' d='M10 50 Q50 20 100 50 T190 50'/%3E%3C/svg%3E")`,
            backgroundSize: '120% 100%',
          }}
          aria-hidden
        />

        {/* Header strip */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#0f766e] to-[#14b8a6] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              ✈
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">{brandShort}</p>
              <p className="text-sm font-semibold leading-tight">{brandName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-100">Boarding pass</p>
            <p className="text-xs opacity-90">{isSale ? 'Venta confirmada' : 'Reserva'}</p>
          </div>
        </div>

        <div className="relative grid gap-0 md:grid-cols-[1fr_auto_220px]">
          {/* Main ticket */}
          <div className="space-y-6 flex flex-col justify-between p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pasajero / Passenger</p>
                <p className="text-xl font-bold text-slate-900">{record.passengerName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clase / Class</p>
                <p className="text-xl font-black text-[#0d9488]">{record.travelClass}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="w-1/3">
                <p className="text-[10px] font-bold uppercase text-slate-500">Desde / From</p>
                <p className="text-4xl font-black text-slate-900">{record.origin}</p>
                <p className="text-xs font-semibold text-slate-600 truncate mr-2" title={record.originLabel}>{record.originLabel}</p>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-2">
                <div className="w-full relative flex items-center justify-center">
                  <div className="w-full border-t-[3px] border-slate-300 border-dashed absolute top-1/2"></div>
                  <span className="text-3xl z-10 bg-[#f5f2eb] px-3 text-teal-600 rotate-90">✈</span>
                </div>
                <div className="bg-teal-100/50 rounded-full px-4 py-1 mt-2">
                  <p className="text-xs font-bold text-teal-800 tracking-wider">Vuelo / Flight <span className="text-base font-black ml-1">{record.flight}</span></p>
                </div>
              </div>
              <div className="w-1/3 text-right">
                <p className="text-[10px] font-bold uppercase text-slate-500">Hacia / To</p>
                <p className="text-4xl font-black text-slate-900">{record.destination}</p>
                <p className="text-xs font-semibold text-slate-600 truncate ml-2" title={record.destinationLabel}>{record.destinationLabel}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 bg-white/60 rounded-xl p-4 border border-slate-200 mt-4 shadow-sm">
              <div>
                <p className="text-[9px] font-bold uppercase text-slate-500">Emitido / Issued</p>
                <p className="text-[11px] leading-tight font-bold text-slate-900">{record.localIssuedAt.replace(',', '\n')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Salida / Depart</p>
                <p className="text-xl font-black text-slate-900">{record.departure}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Puerta / Gate</p>
                <p className="text-xl font-black text-[#0d9488]">{record.gate}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">Asiento / Seat</p>
                <p className="text-xl font-black text-slate-900">{record.seat}</p>
              </div>
            </div>

            <div className="flex items-end justify-between mt-2">
              <p className="text-[10px] text-slate-500 max-w-[60%] leading-tight">
                Documento {record.kind === 'compra' ? 'de embarque' : 'de reserva'} — <span className="font-mono">{record.passport}</span>
                <br />Boarding closes 15 minutes before departure.
              </p>
              <div className="w-1/3">
                <BarcodeBlock value={record.flight + record.passengerName + record.seat} />
              </div>
            </div>
          </div>

          {/* Perforation */}
          <div className="hidden flex-col items-center justify-between border-x border-dashed border-slate-400/60 bg-[#ebe7df] px-[2px] md:flex py-2">
            <div className="h-4 w-4 rounded-full bg-[#d6d3cd] shadow-inner -mt-6" />
            <div className="my-2 w-px grow border-l-[2px] border-dashed border-slate-400/50" />
            <div className="h-4 w-4 rounded-full bg-[#d6d3cd] shadow-inner -mb-6" />
          </div>

          {/* Stub */}
          <div className="flex flex-col justify-between border-t border-dashed border-slate-400/60 bg-[#ebe7df] p-6 md:border-t-0 md:border-l md:border-dashed relative">
            <div className="absolute top-0 right-0 bg-[#0d9488] text-white px-3 py-1 rounded-bl-xl font-bold text-[10px] uppercase tracking-wider">
              {record.seat}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">Pasajero / Passenger</p>
              <p className="font-bold text-sm text-slate-900 leading-tight">{record.passengerName}</p>

              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase text-slate-500">Vuelo / Flight</p>
                <p className="text-xl font-black text-[#0f766e]">{record.flight}</p>
              </div>

              <div className="mt-4 flex gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Origen</p>
                  <p className="font-bold text-slate-900">{record.origin}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">Destino</p>
                  <p className="font-bold text-slate-900">{record.destination}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200">
                <QRCodeSVG
                  value={qrValue}
                  size={110}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
