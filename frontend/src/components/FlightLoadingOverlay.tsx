type FlightLoadingOverlayProps = {
  message?: string;
};

export default function FlightLoadingOverlay({ message = 'Buscando rutas…' }: FlightLoadingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-slate-950/80 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="sarp-loading-plane text-6xl drop-shadow-[0_0_24px_rgba(34,211,238,0.5)]" aria-hidden>
        ✈
      </div>
      <p className="text-sm font-semibold tracking-wide text-cyan-200">{message}</p>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-800">
        <div className="sarp-load-bar-inner h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400" />
      </div>
    </div>
  );
}
