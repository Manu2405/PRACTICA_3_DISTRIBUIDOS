import { useState } from 'react';
import type { Aircraft, Conflict, EventLog, NodeStatus } from '../types';
import { statusBadgeClass } from '../utils';

type AdminTab = 'sync' | 'conflicts' | 'ops' | 'fleet';

type AdminViewProps = {
  nodeStatuses: NodeStatus[];
  conflicts: Conflict[];
  eventLogs: EventLog[];
  aircrafts: Aircraft[];
  brandShort: string;
  brandName: string;
};

function formatClock(d: Date): string {
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
}

const tabs: { id: AdminTab; label: string; hint: string }[] = [
  { id: 'sync', label: 'Sincronización', hint: 'Nodos y consistencia' },
  { id: 'conflicts', label: 'Conflictos y eventos', hint: 'Cola distribuida' },
  { id: 'ops', label: 'Operaciones', hint: 'Liberaciones simuladas' },
  { id: 'fleet', label: 'Flota', hint: 'Modelos de avión' },
];

export default function AdminView({
  nodeStatuses,
  conflicts,
  eventLogs,
  aircrafts,
  brandShort,
  brandName,
}: AdminViewProps) {
  const [tab, setTab] = useState<AdminTab>('sync');
  const [lastUpdate, setLastUpdate] = useState('19:56');
  const [banner, setBanner] = useState<{ message: string; variant: 'info' | 'ok' } | null>(null);
  const [ekPending, setEkPending] = useState(true);

  const flash = (message: string, variant: 'info' | 'ok' = 'info') => {
    setBanner({ message, variant });
    window.setTimeout(() => setBanner(null), 4200);
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl ring-1 ring-white/5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/90">{brandShort} · consola</p>
        <h2 className="mt-2 text-2xl font-bold text-white">{brandName}</h2>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-600/80 bg-slate-800/40 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Regla de negocio (asientos, ref. diagrama)</p>
          <p className="mt-1">
            Reserva y venta no admiten devolución desde estado Venta en este cliente. Devolución (cliente) solo anula reservas de la sesión y
            temporiza el retorno a Libre.
          </p>
        </div>
      </div>

      {banner ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ring-1 animate-fade-in-up ${banner.variant === 'ok'
            ? 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/30'
            : 'bg-cyan-500/15 text-cyan-100 ring-cyan-400/30'
            }`}
          role="status"
        >
          <span className="font-semibold">{brandShort} · </span>
          {banner.message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.hint}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${tab === t.id ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto hidden items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-400 sm:flex">
          <span className="tabular-nums">Última sync UI: {lastUpdate}</span>
        </div>
      </div>

      {tab === 'sync' ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-white">Nodos</h3>
            <p className="mt-2 text-sm text-slate-400">Estado de réplicas y carga (mock).</p>
            <div className="mt-6 grid gap-4">
              {nodeStatuses.map((node) => (
                <div
                  key={node.node}
                  className="rounded-2xl bg-slate-800/90 p-4 ring-1 ring-white/10 transition-all hover:ring-cyan-500/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-400">{node.node}</p>
                      <p className="text-lg font-semibold text-white">{node.status}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold text-slate-950 ${statusBadgeClass(node.status)}`}>
                      {node.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
                    <span>Sync: {node.synced}</span>
                    <span>Carga: {node.load}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-white">Consistencia global</h3>
            <div className="mt-5 rounded-2xl bg-slate-800/80 p-5 ring-1 ring-white/10">
              <div className="mb-4 flex items-end gap-4">
                <div className="flex-1">
                  <div className="text-sm text-slate-400">Coincidencia entre bases</div>
                  <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full animate-[shimmer_2.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                      style={{ width: '96.4%' }}
                    />
                  </div>
                </div>
                <div className="text-3xl font-semibold text-white tabular-nums">96.4%</div>
              </div>
              <p className="text-sm text-slate-300">Verificación simulada de integridad distribuida.</p>
            </div>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setLastUpdate(formatClock(new Date()));
                  flash('Sincronización forzada completada en nodos (simulado).', 'ok');
                }}
                className="rounded-2xl bg-cyan-500/90 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
              >
                Forzar sincronización
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'conflicts' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div id="admin-conflicts" className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-white">Conflictos</h3>
              <button
                type="button"
                onClick={() => flash('Lista de conflictos refrescada (simulado).', 'info')}
                className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Revisar cola
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {conflicts.map((conflict) => (
                <div key={conflict.code} className="rounded-2xl bg-slate-800/90 p-4 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{conflict.code}</p>
                      <p className="text-sm text-slate-400">{conflict.message}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{conflict.detected}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">Ubicación: {conflict.location}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-white">Eventos</h3>
            <div className="mt-5 space-y-3">
              {eventLogs.map((event) => (
                <div key={`${event.time}-${event.event}`} className="rounded-2xl bg-slate-800/90 p-4 ring-1 ring-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-white">{event.event}</p>
                    <span className="text-xs text-slate-400">{event.time}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{event.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'ops' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-white">Anulaciones / liberaciones</h3>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-800/90 p-4 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">Vuelo TK204</p>
                    <p className="text-sm text-slate-400">Liberación verificada</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => flash('TK204: auditoría cerrada (simulado).', 'ok')}
                    className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                  >
                    Revisar
                  </button>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-800/90 p-4 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">Vuelo EK404</p>
                    <p className="text-sm text-slate-400">
                      {ekPending ? 'Pendiente de liberación simulada' : 'Inventario actualizado'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!ekPending}
                    onClick={() => {
                      setEkPending(false);
                      flash('EK404: cupos devueltos al catálogo (simulado).', 'ok');
                    }}
                    className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40"
                  >
                    Liberar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 ring-1 ring-amber-500/20">
            <h3 className="text-lg font-semibold text-amber-100">Criterios con PM</h3>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-amber-100/80">
              <li>Etiq. de estados y colores idénticos al diagrama oficial.</li>
              <li>Flujo cliente sin pasos ambiguos; siempre visible el paso actual.</li>
              <li>Horarios: siempre mostrar TZ de origen/destino + hora local del comprador.</li>
              <li>Panel admin: foco por pestaña (sync / conflictos / ops).</li>
            </ul>
          </div>
        </div>
      ) : null}

      {tab === 'fleet' ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white">Modelos de avión</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {aircrafts.map((aircraft) => (
              <div key={aircraft.model} className="rounded-2xl bg-slate-800/90 p-4 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{aircraft.model}</p>
                    <p className="text-sm text-slate-400">
                      {aircraft.manufacturer} · {aircraft.origin}
                    </p>
                  </div>
                  <span className="text-sm text-slate-300">{aircraft.engines}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
                  <div>Primera: {aircraft.first}</div>
                  <div>Económica: {aircraft.economy}</div>
                  <div>Alcance: {aircraft.rangeKm} km</div>
                  <div>Crucero: {aircraft.cruise} km/h</div>
                  <div className="col-span-2 text-cyan-300">Peso: {aircraft.weight ?? 'N/A'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
