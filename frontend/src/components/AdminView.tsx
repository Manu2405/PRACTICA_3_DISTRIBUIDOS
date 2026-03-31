import { useState, useMemo, useEffect } from 'react';
import type { Aircraft, Conflict, EventLog, NodeStatus, Language, FlightStatus, RouteOffer } from '../types';
import { statusBadgeClass } from '../utils';
import { translations, getStatusLabel } from '../i18n';
import { routeMatrix } from '../data';

type AdminTab = 'sync' | 'conflicts' | 'ops' | 'fleet' | 'dashboard';

type AdminViewProps = {
  lang: Language;
  nodeStatuses: NodeStatus[];
  conflicts: Conflict[];
  eventLogs: EventLog[];
  aircrafts: Aircraft[];
  brandShort: string;
  brandName: string;
};

// --- Sub-components for Sync Dashboard ---

function ClusterNode({ node, index, total, t, lang }: { node: NodeStatus; index: number; total: number; t: any; lang: Language }) {
  const angle = (index / total) * 2 * Math.PI;
  const radius = 140; // Radial distance
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  // Simulated metrics
  const latency = useMemo(() => Math.floor(Math.random() * 25) + 5, []);
  const uptime = useMemo(() => (99 + Math.random()).toFixed(2), []);

  return (
    <div 
      className="absolute flex flex-col items-center group transition-all duration-500 hover:z-20"
      style={{ transform: `translate(calc(50% + ${x}px - 50%), calc(50% + ${y}px - 50%))`, left: '50%', top: '50%', marginTop: '-40px', marginLeft: '-40px' }}
    >
      {/* Node connectivity path pulse */}
      <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ transform: `translate(40px, 40px)` }}>
         <line 
            x1="0" y1="0" x2={-x} y2={-y} 
            className="stroke-slate-700/50 stroke-[1.5]" 
         />
         <circle r="3" className="fill-cyan-400">
            <animateMotion 
               dur="2s" 
               repeatCount="indefinite" 
               path={`M ${-x} ${-y} L 0 0`}
               keyPoints="0;1"
               keyTimes="0;1"
            />
         </circle>
      </svg>

      <div className="relative w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 shadow-xl flex flex-col items-center justify-center gap-1 group-hover:scale-110 group-hover:border-cyan-500/50 transition-all z-10 hover:z-20">
         <div className={`w-3 h-3 rounded-full ${node.status === 'Online' || node.status === 'Sincronizado' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'} animate-pulse`} />
         <div className="bg-slate-950/40 px-2 py-0.5 rounded-md backdrop-blur-sm border border-white/5">
            <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate max-w-[64px] block text-center leading-tight">{node.node}</span>
         </div>
         
         {/* Hover Tooltip/Stats */}
         <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-32 bg-slate-950/90 border border-white/10 p-2 rounded-xl scale-0 group-hover:scale-100 transition-transform pointer-events-none backdrop-blur-md z-30 shadow-2xl">
            <div className="space-y-1">
               <div className="flex justify-between text-[8px] text-slate-400"><span>{t.latency}:</span> <span className="text-cyan-400 font-mono">{latency}ms</span></div>
               <div className="flex justify-between text-[8px] text-slate-400"><span>{t.uptime}:</span> <span className="text-emerald-400 font-mono">{uptime}%</span></div>
               <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${node.load}%` }} />
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function ProtocolLog({ lang, t }: { lang: Language; t: any }) {
  const [logs, setLogs] = useState<{ id: number, text: string, type: 'info' | 'warn' | 'success' }[]>([]);
  
  useEffect(() => {
    const events = [
      'ACK received from Node-B',
      'Consensus round #492 initiated',
      'Checksum validated: 0x4f2a',
      'Block #943 propagated to cluster',
      'Paxos quorum achieved',
      'Heartbeat pulse: OK',
      'Replica delta synchronized',
      'Node-A promoted to Lead Sync'
    ];
    
    const interval = setInterval(() => {
      setLogs(prev => {
        const newLog: { id: number, text: string, type: 'info' | 'warn' | 'success' } = { 
          id: Date.now(), 
          text: events[Math.floor(Math.random() * events.length)],
          type: Math.random() > 0.8 ? 'warn' : Math.random() > 0.5 ? 'success' : 'info'
        };
        return [newLog, ...prev].slice(0, 8);
      });
    }, 2500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full bg-slate-950/80 border border-slate-800 rounded-3xl p-4 font-mono text-[10px] overflow-hidden flex flex-col">
       <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-slate-500 uppercase font-black text-[9px] tracking-widest">{t.protocol_log}</span>
       </div>
       <div className="space-y-2 flex-grow overflow-y-auto custom-scrollbar pr-2">
          {logs.map(log => (
            <div key={log.id} className={`flex gap-2 animate-fade-in-right ${log.type === 'warn' ? 'text-amber-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
               <span className="opacity-30">[{new Date(log.id).toLocaleTimeString()}]</span>
               <span className="truncate">{log.text}</span>
            </div>
          ))}
          {logs.length === 0 && <div className="text-slate-700 italic">{t.initializing_console}</div>}
       </div>
    </div>
  );
}

// --- Main Admin View ---

export default function AdminView({
  lang,
  nodeStatuses,
  conflicts,
  eventLogs,
  aircrafts: initialAircrafts,
  brandShort,
  brandName,
}: AdminViewProps) {
  const t = translations[lang];
  const [tab, setTab] = useState<AdminTab>('sync');
  const [lastUpdate, setLastUpdate] = useState('19:56');
  const [banner, setBanner] = useState<{ message: string; variant: 'info' | 'ok' } | null>(null);
  const [ekPending, setEkPending] = useState(true);
  
  const [aircrafts, setAircrafts] = useState<Aircraft[]>(initialAircrafts);
  const [editingAircraft, setEditingAircraft] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Aircraft | null>(null);

  const [selectedFlightCode, setSelectedFlightCode] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterRoute, setFilterRoute] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const flash = (message: string, variant: 'info' | 'ok' = 'info') => {
    setBanner({ message, variant });
    window.setTimeout(() => setBanner(null), 4200);
  };

  const tabs: { id: AdminTab; label: string; hint: string }[] = [
    { id: 'sync', label: t.sync, hint: t.hint_sync },
    { id: 'dashboard', label: t.dashboard, hint: t.hint_dashboard },
    { id: 'conflicts', label: t.conflicts, hint: t.hint_conflicts },
    { id: 'fleet', label: t.fleet, hint: t.hint_fleet },
    { id: 'ops', label: t.ops, hint: t.hint_ops },
  ];

  const getHash = (s: string) => s.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  
  const allRoutes = useMemo(() => {
    const flat: RouteOffer[] = [];
    Object.values(routeMatrix).forEach(destMap => {
        Object.values(destMap).forEach(route => flat.push(route));
    });
    return flat;
  }, []);

  const filteredRoutes = useMemo(() => {
    return allRoutes.filter(r => {
      const matchRoute = filterRoute ? r.path.join('-').includes(filterRoute) : true;
      const matchStatus = filterStatus ? r.status === filterStatus : true;
      return matchRoute && matchStatus;
    });
  }, [allRoutes, filterRoute, filterStatus]);

  const globalStats = useMemo(() => {
    const totalFlights = filteredRoutes.length;
    
    let soldSeats = 0;
    let reservedSeats = 0;
    let totalIncomeFirst = 0;
    let totalIncomeEconomy = 0;
    let totalCapacity = 0;

    filteredRoutes.forEach(r => {
      const hash = Math.abs(getHash(r.flight));
      const ac = aircrafts.find(a => r.plane.includes(a.model)) || aircrafts[0];
      
      const flightSold = Math.floor((hash % 40) + (ac.economy * 0.6));
      const flightReserved = Math.floor(hash % 15);
      
      soldSeats += flightSold;
      reservedSeats += flightReserved;
      totalCapacity += (ac.first + ac.economy);
      
      totalIncomeEconomy += (flightSold * r.economy);
      totalIncomeFirst += (Math.floor(flightSold * 0.1) * r.first);
    });

    return { totalFlights, soldSeats, reservedSeats, totalIncomeFirst, totalIncomeEconomy, totalCapacity, availability: totalCapacity - soldSeats - reservedSeats };
  }, [filteredRoutes, aircrafts]);

  const selectedFlight = useMemo(() => {
    return allRoutes.find(f => f.flight === selectedFlightCode);
  }, [allRoutes, selectedFlightCode]);

  const selectedFlightStats = useMemo(() => {
    if (!selectedFlight) return null;
    const ac = aircrafts.find(a => selectedFlight.plane.includes(a.model)) || aircrafts[0];
    const hash = Math.abs(getHash(selectedFlight.flight));
    
    const soldEconomy = Math.floor((hash % 40) + (ac.economy * 0.6));
    const soldFirst = Math.floor((hash % 8) + (ac.first * 0.3));
    const reserved = Math.floor(hash % 10);
    const availability = (ac.economy + ac.first) - (soldEconomy + soldFirst + reserved);
    const totalIncome = (soldEconomy * selectedFlight.economy) + (soldFirst * selectedFlight.first);

    return { soldEconomy, soldFirst, reserved, availability, ac, totalIncome };
  }, [selectedFlight, aircrafts]);

  const handleEditAircraft = (a: Aircraft) => {
    setEditingAircraft(a.model);
    setEditFormData({ ...a });
  };

  const saveAircraft = () => {
    if (!editFormData) return;
    setAircrafts(prev => prev.map(a => a.model === editingAircraft ? editFormData : a));
    setEditingAircraft(null);
    setEditFormData(null);
    flash(t.model_updated, 'ok');
  };

  return (
    <section className="space-y-6 animate-fade-in-up pb-10">
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl ring-1 ring-white/5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">{brandShort} · {t.brand_console}</p>
        <h2 className="mt-2 text-2xl font-black text-white">{brandName}</h2>
      </div>

      {banner && (
        <div className={`rounded-2xl px-4 py-3 text-sm ring-1 animate-fade-in-up ${banner.variant === 'ok' ? 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/30' : 'bg-cyan-500/15 text-cyan-100 ring-cyan-400/30'}`} role="status">
          <span className="font-black">{brandShort} · </span>{banner.message}
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-2">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${tab === tabItem.id ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            {tabItem.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 rounded-xl bg-slate-800/80 px-3 py-2 text-[10px] text-slate-400 border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold tabular-nums">{t.last_sync}: {lastUpdate}</span>
        </div>
      </div>

      {tab === 'sync' && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
           {/* Visual Cluster Map */}
           <div className="relative rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 min-h-[460px] flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute top-6 left-6 flex flex-col gap-1">
                 <h3 className="text-xl font-black text-white uppercase tracking-tighter">{t.cluster_health}</h3>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.sync_active}</p>
              </div>

              {/* Central Consensus Hub */}
              <div className="relative z-10 w-24 h-24 rounded-full bg-slate-950 border-2 border-cyan-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.15)] animate-pulse-slow">
                 <div className="absolute inset-2 rounded-full border border-cyan-400/20 animate-spin-slow" />
                 <div className="text-center">
                    <p className="text-[8px] font-black text-cyan-400 uppercase tracking-[0.2em]">{t.consensus}</p>
                    <p className="text-xs font-black text-white mt-0.5">{t.master}</p>
                 </div>
              </div>

              {/* Node Satellites */}
              <div className="absolute inset-0 pointer-events-none">
                 {nodeStatuses.map((node, i) => (
                    <div key={node.node} className="pointer-events-auto">
                       <ClusterNode node={node} index={i} total={nodeStatuses.length} t={t} lang={lang} />
                    </div>
                 ))}
              </div>
           </div>

           {/* Vertical Secondary Panel */}
           <div className="space-y-6 flex flex-col">
              {/* Consistency Radial Gauge */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl flex flex-col items-center gap-4">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest self-start">{t.consistency}</h3>
                 <div className="relative w-36 h-36">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                       <circle cx="50" cy="50" r="45" className="stroke-slate-800 stroke-[10] fill-none" />
                       <circle 
                          cx="50" cy="50" r="45" 
                          className="stroke-cyan-500 stroke-[10] fill-none" 
                          strokeDasharray="283" 
                          strokeDashoffset={283 - (283 * 0.964)} 
                          strokeLinecap="round"
                       />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-3xl font-black text-white tabular-nums">96.4%</span>
                       <span className="text-[8px] font-bold text-emerald-400 uppercase">{t.optimal}</span>
                    </div>
                 </div>
              </div>

              {/* Console/Protocol Log */}
              <div className="flex-grow">
                 <ProtocolLog lang={lang} t={t} />
              </div>
           </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="space-y-8 animate-fade-in-up">
           <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-lg ring-1 ring-white/5">
                 <p className="text-xs text-slate-400 uppercase tracking-widest">{t.total_income}</p>
                 <p className="text-3xl font-bold text-emerald-400 mt-2 tabular-nums">${(globalStats.totalIncomeFirst + globalStats.totalIncomeEconomy).toLocaleString()}</p>
                 <div className="mt-3 space-y-1">
                    <p className="text-[10px] text-slate-500 flex justify-between">
                       <span>{t.first_class}:</span> 
                       <span className="text-slate-300 font-mono">${globalStats.totalIncomeFirst.toLocaleString()}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 flex justify-between">
                       <span>{t.economy}:</span> 
                       <span className="text-slate-300 font-mono">${globalStats.totalIncomeEconomy.toLocaleString()}</span>
                    </p>
                 </div>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-lg ring-1 ring-white/5">
                 <p className="text-xs text-slate-400 uppercase tracking-widest">{t.seats_sold}</p>
                 <p className="text-3xl font-bold text-white mt-2 tabular-nums">{globalStats.soldSeats.toLocaleString()}</p>
                 <p className="text-[10px] text-slate-500 mt-1">{t.availability}: {globalStats.availability.toLocaleString()}</p>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-lg ring-1 ring-white/5">
                 <p className="text-xs text-slate-400 uppercase tracking-widest">{t.reservations}</p>
                 <p className="text-3xl font-bold text-yellow-500 mt-2 tabular-nums">{globalStats.reservedSeats.toLocaleString()}</p>
              </div>
              <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-lg ring-1 ring-white/5">
                 <p className="text-xs text-slate-400 uppercase tracking-widest">{t.global_stats}</p>
                 <p className="text-3xl font-bold text-cyan-400 mt-2 tabular-nums">{globalStats.totalFlights}</p>
                 <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">{t.fleet}</p>
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/5">
              <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] font-bold text-slate-500 uppercase px-1">{t.filter_by_date}</span>
                 <input type="date" className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] font-bold text-slate-500 uppercase px-1">{t.filter_by_route}</span>
                 <select className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500" value={filterRoute} onChange={e => setFilterRoute(e.target.value)}>
                    <option value="">{t.all_routes}</option>
                    {Array.from(new Set(allRoutes.map(r => r.path.join('-')))).map(path => (
                       <option key={path} value={path}>{path}</option>
                    ))}
                 </select>
              </div>
              <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] font-bold text-slate-500 uppercase px-1">{t.filter_by_status}</span>
                 <select className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">{t.all_statuses}</option>
                    {(['On Time', 'Boarding', 'En Route', 'Arrived'] as FlightStatus[]).map(s => (
                       <option key={s} value={s}>{getStatusLabel(s, lang)}</option>
                    ))}
                 </select>
              </div>
              <button onClick={() => {setFilterDate(''); setFilterRoute(''); setFilterStatus('')}} className="mt-5 px-4 py-2 text-xs font-bold text-slate-500 hover:text-white uppercase transition-colors">{t.reset}</button>
           </div>

           <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                 <h3 className="text-xl font-semibold text-white">{t.flight_detail}</h3>
                 <select className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500" onChange={(e) => setSelectedFlightCode(e.target.value)} value={selectedFlightCode || ''}>
                    <option value="">{t.select_flight}</option>
                    {allRoutes.map(r => <option key={r.flight} value={r.flight}>{r.flight} ({r.path.join('-')})</option>)}
                 </select>
              </div>
              {selectedFlight ? (
                  <div className="grid gap-6 md:grid-cols-2">
                     <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                        <p className="text-xs text-slate-500 uppercase">{t.selected_flight}</p>
                        <p className="text-xl font-bold text-white">{selectedFlight.flight} · {selectedFlight.path.join(' → ')}</p>
                        <p className="text-sm text-cyan-400 mt-1 uppercase font-bold">{getStatusLabel(selectedFlight.status, lang)}</p>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                           <div>
                              <p className="text-[10px] text-slate-500 uppercase">{t.seats_sold}</p>
                              <p className="text-lg font-bold text-white tabular-nums">
                                 {(selectedFlightStats?.soldEconomy || 0) + (selectedFlightStats?.soldFirst || 0)}
                              </p>
                           </div>
                           <div>
                              <p className="text-[10px] text-slate-500 uppercase">{t.reservations}</p>
                              <p className="text-lg font-bold text-yellow-500 tabular-nums">
                                 {selectedFlightStats?.reserved}
                              </p>
                           </div>
                           <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{t.availability}</p>
                              <p className="text-lg font-bold text-cyan-400 tabular-nums">
                                 {selectedFlightStats?.availability}
                              </p>
                           </div>
                           <div className="border-t border-white/5 pt-3 col-span-2">
                              <p className="text-[10px] text-slate-500 uppercase mb-1">{t.total_income}</p>
                              <p className="text-xl font-black text-emerald-400 font-mono">
                                 ${selectedFlightStats?.totalIncome?.toLocaleString()}
                              </p>
                           </div>
                        </div>
                     </div>
                     <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                        <p className="text-xs text-slate-500 uppercase">{t.first_vs_economy}</p>
                        <div className="mt-4 space-y-4">
                           <div>
                              <div className="flex justify-between text-xs mb-1 font-bold">
                                 <span className="text-cyan-200">{t.first_class}</span>
                                 <span className="text-slate-400 font-mono">{selectedFlightStats?.soldFirst} / {selectedFlightStats?.ac.first}</span>
                              </div>
                              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]" 
                                    style={{ width: `${(selectedFlightStats?.soldFirst || 0) / (selectedFlightStats?.ac.first || 1) * 100}%` }} 
                                 />
                              </div>
                           </div>
                           <div>
                              <div className="flex justify-between text-xs mb-1 font-bold">
                                 <span className="text-emerald-400">{t.economy}</span>
                                 <span className="text-slate-400 font-mono">{selectedFlightStats?.soldEconomy} / {selectedFlightStats?.ac.economy}</span>
                              </div>
                              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                 <div 
                                    className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                    style={{ width: `${(selectedFlightStats?.soldEconomy || 0) / (selectedFlightStats?.ac.economy || 1) * 100}%` }} 
                                 />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
              ) : (
                <div className="text-center py-12 text-slate-500 italic">
                   {t.select_flight}
                </div>
              )}
           </div>
        </div>
      )}

      {tab === 'fleet' && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-xl font-black text-white uppercase tracking-tighter">{t.aircraft_models}</h3>
             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">{aircrafts.length} {t.units}</span>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {aircrafts.map((aircraft) => (
              <div key={aircraft.model} className="rounded-2xl bg-slate-800/60 p-5 ring-1 ring-white/10 border-b-2 border-transparent hover:border-cyan-500/50 transition-all">
                {editingAircraft === aircraft.model ? (
                  <div className="space-y-4">
                     <p className="font-black text-cyan-400">{aircraft.model}</p>
                     <div className="grid grid-cols-2 gap-3">
                        <label className="text-[10px] text-slate-500 block px-1 uppercase font-bold">
                           {t.manufacturer}
                           <input className="mt-1 w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white outline-none focus:ring-1 focus:ring-cyan-500" value={editFormData?.manufacturer} onChange={e => setEditFormData(prev => prev ? {...prev, manufacturer: e.target.value} : null)} />
                        </label>
                        <label className="text-[10px] text-slate-500 block px-1 uppercase font-bold">
                           {t.first_capacity}
                           <input type="number" className="mt-1 w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white outline-none focus:ring-1 focus:ring-cyan-500" value={editFormData?.first} onChange={e => setEditFormData(prev => prev ? {...prev, first: parseInt(e.target.value)} : null)} />
                        </label>
                        <label className="text-[10px] text-slate-500 block px-1 uppercase font-bold">
                           {t.economy_capacity}
                           <input type="number" className="mt-1 w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white outline-none focus:ring-1 focus:ring-cyan-500" value={editFormData?.economy} onChange={e => setEditFormData(prev => prev ? {...prev, economy: parseInt(e.target.value)} : null)} />
                        </label>
                        <label className="text-[10px] text-slate-500 block px-1 uppercase font-bold">
                           {t.engines}
                           <input className="mt-1 w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white outline-none focus:ring-1 focus:ring-cyan-500" value={editFormData?.engines} onChange={e => setEditFormData(prev => prev ? {...prev, engines: e.target.value} : null)} />
                        </label>
                        <label className="text-[10px] text-slate-500 block px-1 uppercase font-bold">
                           {t.range_km}
                           <input className="mt-1 w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white outline-none focus:ring-1 focus:ring-cyan-500" value={editFormData?.rangeKm} onChange={e => setEditFormData(prev => prev ? {...prev, rangeKm: e.target.value} : null)} />
                        </label>
                        <label className="text-[10px] text-slate-500 block px-1 uppercase font-bold">
                           {t.cruise_speed}
                           <input className="mt-1 w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-white outline-none focus:ring-1 focus:ring-cyan-500" value={editFormData?.cruise} onChange={e => setEditFormData(prev => prev ? {...prev, cruise: e.target.value} : null)} />
                        </label>
                     </div>
                     <div className="flex gap-2 justify-end mt-4 text-[10px]">
                        <button onClick={() => setEditingAircraft(null)} className="px-3 py-1.5 font-bold text-slate-400 hover:text-white uppercase">{t.cancel}</button>
                        <button onClick={saveAircraft} className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold uppercase">{t.save}</button>
                     </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-white/10 shadow-inner group">
                           <svg className="w-6 h-6 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5l-3.5 3.5-8.2-1.8L2 10.2l8.2 3.5 3.5 8.2 3.9-3.5z" />
                           </svg>
                        </div>
                        <div>
                           <p className="font-bold text-white tracking-tight text-base leading-tight uppercase">{aircraft.model}</p>
                           <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">{aircraft.manufacturer} · {aircraft.origin}</p>
                        </div>
                      </div>
                      <button onClick={() => handleEditAircraft(aircraft)} className="rounded-xl border border-white/10 hover:bg-cyan-500 hover:text-slate-950 px-3 py-1.5 text-[10px] text-cyan-400 font-black uppercase tracking-widest transition-all">{t.edit}</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 py-3 border-t border-white/5">
                        <div className="space-y-1">
                           <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{t.first_class}</p>
                           <p className="text-sm font-black text-white tabular-nums">{aircraft.first} <span className="text-[10px] text-slate-600 font-medium lowercase">{t.units}</span></p>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{t.economy}</p>
                           <p className="text-sm font-black text-white tabular-nums">{aircraft.economy} <span className="text-[10px] text-slate-600 font-medium lowercase">{t.units}</span></p>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-slate-950/30 -mx-5 -mb-5 p-4 mt-1 border-t border-white/5">
                       <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{t.range_km}</span>
                          <span className="text-[10px] font-mono text-cyan-400">{aircraft.rangeKm} Km</span>
                       </div>
                       <div className="flex flex-col text-right">
                          <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{t.cruise_speed}</span>
                          <span className="text-[10px] font-mono text-emerald-400">{aircraft.cruise} Km/h</span>
                       </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'conflicts' && (
         <div id="admin-conflicts" className="space-y-6 animate-fade-in-up">
            <div className="grid gap-6 lg:grid-cols-[0.4fr_0.6fr]">
               {/* Conflict Queue */}
               <div className="rounded-3xl border border-rose-500/20 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-6">
                     <h3 className="text-xl font-black text-rose-400 uppercase tracking-tighter">{t.active_conflicts}</h3>
                  </div>
                  <div className="space-y-3">
                     {conflicts.map((conflict) => (
                        <div key={conflict.code} className="rounded-2xl bg-rose-500/5 group border border-rose-500/10 p-4 hover:bg-rose-500/10 transition-colors">
                           <div className="flex justify-between items-start mb-1">
                              <span className="font-mono text-xs font-bold text-rose-400">{conflict.code}</span>
                              <span className="text-[10px] text-slate-500 font-bold">{conflict.detected}</span>
                           </div>
                           <p className="text-sm font-bold text-white mb-1 uppercase tracking-tight">{conflict.location}</p>
                           <p className="text-xs text-slate-400 leading-relaxed">{conflict.message}</p>
                        </div>
                     ))}
                     {conflicts.length === 0 && <div className="text-slate-600 italic py-10 text-center">{t.no_conflicts}</div>}
                  </div>
               </div>

               {/* Event Timeline */}
               <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                     <h3 className="text-xl font-black text-cyan-400 uppercase tracking-tighter">{t.system_events}</h3>
                  </div>
                  <div className="space-y-6 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
                     {eventLogs.map((log, idx) => (
                        <div key={idx} className="relative pl-8 pb-6 last:pb-0">
                           {/* Timeline Dot & Line */}
                           <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-cyan-500 bg-slate-950 z-10" />
                           {idx !== eventLogs.length - 1 && <div className="absolute left-[5px] top-4 w-0.5 h-full bg-slate-800" />}

                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full">{log.time}</span>
                              <span className="text-xs font-black text-white uppercase tracking-widest">{log.event}</span>
                           </div>
                           <p className="text-sm text-slate-400 font-medium">{log.detail}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      )}

      {tab === 'ops' && (
         <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{t.ops}</h3>
               <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {t.live_control}
               </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
               {/* Main Operational Task */}
               <div className="rounded-3xl border border-amber-500/20 bg-slate-900 p-6 shadow-xl ring-1 ring-white/5 group hover:border-amber-500/40 transition-all">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">{t.critical_action}</p>
                        <h4 className="text-xl font-black text-white">Vuelo EK404</h4>
                     </div>
                     <div className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-tighter ${ekPending ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {ekPending ? t.conflicts : t.status_arrived}
                     </div>
                  </div>
                  <div className="space-y-4 mb-6">
                     <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{t.step_2}:</span>
                        <span className="text-white font-bold">SIN → DXB</span>
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{t.checkin_status}:</span>
                        <span className="text-emerald-400 font-bold">84% {t.completed}</span>
                     </div>
                  </div>
                  {ekPending ? (
                     <button 
                        onClick={() => {setEkPending(false); flash(t.flight_released, 'ok')}} 
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-amber-500/10 group-hover:scale-[1.02]"
                     >
                        {t.release_boarding}
                     </button>
                  ) : (
                     <div className="w-full bg-slate-800 text-slate-400 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center border border-white/5">
                        {t.completed}
                     </div>
                  )}
               </div>

               {/* Simulated Ongoing Ops */}
               {[
                  { flight: 'AA102', path: 'ATL → LAX', status: t.status_boarding, color: 'text-cyan-400' },
                  { flight: 'LH310', path: 'ATL → FRA', status: t.status_en_route, color: 'text-blue-400' },
                  { flight: 'AF420', path: 'ATL → PAR', status: t.conflicts, color: 'text-rose-400' }
               ].map((op, i) => (
                  <div key={i} className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-lg backdrop-blur-sm flex flex-col justify-between">
                     <div>
                        <div className="flex justify-between items-start mb-4">
                           <h4 className="text-lg font-black text-white">{op.flight}</h4>
                           <span className={`text-[9px] font-bold ${op.color} uppercase tracking-widest`}>{op.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mb-4">{op.path}</p>
                     </div>
                     <div className="flex gap-2">
                        <button className="flex-grow bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-colors">{t.details}</button>
                        <button className="px-3 bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-500 py-2 rounded-xl text-[9px] font-black uppercase transition-colors border border-white/5">{t.stop}</button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}
    </section>
  );
}
