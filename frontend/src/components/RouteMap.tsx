import { useId, useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { City, RouteOffer } from '../types';

type RouteMapProps = {
  cities: City[];
  origin: string;
  destination: string;
  selectedRoute: RouteOffer | null;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

function nodeClasses(code: string, path: string[] | undefined, origin: string, destination: string): string {
  const onPath = path?.includes(code) ?? false;
  if (code === origin) {
    return 'w-2.5 h-2.5 rounded-full bg-sky-400 shadow-lg shadow-sky-500/50 ring-[1.5px] ring-white border border-white/40 scale-110 route-node-pulse';
  }
  if (code === destination) {
    return 'w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/50 ring-[1.5px] ring-white border border-white/40 scale-110 route-node-pulse';
  }
  if (onPath) {
    return 'w-2 h-2 rounded-full bg-cyan-300 shadow-md shadow-cyan-500/40 border border-white/30';
  }
  return 'w-1.5 h-1.5 rounded-full bg-slate-600 border border-white/10';
}

function MapOverlay({ cities, origin, destination, path }: { cities: City[], origin: string, destination: string, path: string[] | undefined }) {
  const map = useMap();
  const uid = useId().replace(/:/g, '');
  const gradId = `routeGrad-${uid}`;
  const pathId = `routeMotion-${uid}`;

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let frameId: number;
    const handler = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setTick((t) => t + 1);
      });
    };
    map.on('move zoom resize', handler);
    // Disparar un renderizado inicial asegurándonos de que haya cargado bounds
    setTimeout(handler, 100);
    return () => {
      cancelAnimationFrame(frameId);
      map.off('move zoom resize', handler);
    };
  }, [map]);

  useEffect(() => {
    if (path && path.length > 0) {
      const coords = path.map(code => {
        const c = cities.find(x => x.code === code);
        return c ? [c.lat, c.lng] as [number, number] : null;
      }).filter(Boolean) as [number, number][];

      if (coords.length > 0) {
        map.fitBounds(coords, { padding: [60, 60], animate: true, maxZoom: 6 });
      }
    } else {
      map.setView([20, 0], window.innerWidth < 600 ? 1 : 2);
    }
  }, [map, path, cities]);

  const pixelNodes = useMemo(() => {
    return cities.map(city => {
      const pt = map.latLngToContainerPoint([city.lat, city.lng]);
      return { ...city, px: pt.x, py: pt.y };
    });
  }, [map, cities, tick]);

  const motionPathD = useMemo(() => {
    if (!path?.length) return '';
    const parts = path
      .map((code, i) => {
        const c = pixelNodes.find((x) => x.code === code);
        if (!c) return '';
        return `${i === 0 ? 'M' : 'L'} ${c.px} ${c.py}`;
      })
      .filter(Boolean);
    return parts.join(' ');
  }, [path, pixelNodes]);

  const segments =
    path?.map((code, index) => {
      const city = pixelNodes.find((c) => c.code === code);
      const nextCode = path[index + 1];
      const nextCity = nextCode ? pixelNodes.find((c) => c.code === nextCode) : undefined;
      if (!city || !nextCity) return null;
      return (
        <line
          key={`${code}-${nextCode}`}
          x1={city.px}
          y1={city.py}
          x2={nextCity.px}
          y2={nextCity.py}
          stroke={`url(#${gradId})`}
          className="route-flow-line"
          vectorEffect="non-scaling-stroke"
        />
      );
    }) ?? [];

  const mapPoints = pixelNodes.map((city) => {
    const labelMuted = !path?.includes(city.code);
    const label =
      city.code === origin
        ? `${city.code}`
        : city.code === destination
          ? `${city.code}`
          : city.code;

    // Solo dibujar si está en el viewport para evitar bugs de DOM
    if (city.px < -200 || city.py < -200 || city.px > window.innerWidth + 200) return null;

    return (
      <div
        key={city.code}
        className={`absolute z-10 text-[8px] leading-tight ${labelMuted ? 'text-slate-500 opacity-60' : 'text-slate-50 opacity-100'}`}
        style={{ left: city.px, top: city.py, transform: 'translate(-50%, -50%)' }}
      >
        <div className={`mx-auto ${nodeClasses(city.code, path, origin, destination)}`} />
        <span className="mt-1 block max-w-[4rem] text-center font-semibold drop-shadow">{label}</span>
      </div>
    );
  });

  return (
    <div className="absolute inset-0 z-[1000] pointer-events-none w-full h-full">
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-30 bg-[radial-gradient(ellipse_at_30%_20%,rgba(56,189,248,0.25),transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(99,102,241,0.20),transparent_45%)]"
        aria-hidden
      />
      <svg
        className="absolute inset-0 z-[2] w-full h-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(56 189 248)" stopOpacity="0.95" />
            <stop offset="50%" stopColor="rgb(34 211 238)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="rgb(129 140 248)" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        {segments}
        {motionPathD ? (
          <>
            <path id={pathId} d={motionPathD} fill="none" stroke="none" />
            <g>
              <animateMotion dur="12s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#${pathId}`} />
              </animateMotion>
              <g transform="translate(-8,-6) scale(2)">
                <path
                  d="M4.6 1.7L4.6 2.5L2 4L2 4.7L4.6 3.9L4.6 5.8L3.5 6.5L3.5 7L4.9 6.7L5 6.7L6.4 7L6.4 6.5L5.3 5.8L5.3 3.9L7.9 4.7L7.9 4L5.3 2.5L5.3 1.7C5.3 1.3 5 1 4.6 1.7Z"
                  fill="white"
                  stroke="rgba(15,23,42,0.4)"
                  strokeWidth="0.1"
                  transform="rotate(90 5 4)"
                />
              </g>
            </g>
          </>
        ) : null}
      </svg>
      {mapPoints}
    </div>
  );
}

export default function RouteMap({
  cities,
  origin,
  destination,
  selectedRoute,
  className = '',
  isExpanded = false,
}: RouteMapProps) {
  const path = selectedRoute?.path;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl bg-slate-950 p-0 shadow-inner ring-1 ring-cyan-500/10 flex items-center justify-center ${isExpanded ? 'h-full aspect-auto' : 'aspect-[2/1] sm:aspect-[2.5/1]'} ${className}`}
    >
      <MapContainer
        center={[20, 0]}
        zoom={2}
        zoomControl={isExpanded}
        dragging={isExpanded}
        scrollWheelZoom={isExpanded}
        doubleClickZoom={isExpanded}
        attributionControl={false}
        className="absolute inset-0 w-full h-full z-0"
        style={{ background: '#020617' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        />
        <MapOverlay cities={cities} origin={origin} destination={destination} path={path} />
      </MapContainer>
    </div>
  );
}
