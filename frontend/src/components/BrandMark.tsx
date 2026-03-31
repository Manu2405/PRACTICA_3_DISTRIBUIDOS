import { useState } from 'react';

type BrandMarkProps = {
  name: string;
  tagline: string;
  shortName: string;
  /** Ruta pública, ej. `/image.png` en `public/` */
  iconSrc?: string;
};

export default function BrandMark({ name, tagline, shortName, iconSrc }: BrandMarkProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(iconSrc) && !imgFailed;

  return (
    <div className="flex items-center gap-4">
      <div
        className="brand-mark-icon relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-400 via-cyan-500 to-teal-700 shadow-lg shadow-teal-900/40 ring-2 ring-white/30"
        aria-hidden
      >
        {showImage ? (
          <img
            src={iconSrc}
            alt=""
            className="sarp-brand-img h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <svg viewBox="0 0 48 48" className="sarp-wing-drift h-9 w-9 text-white drop-shadow-md" fill="currentColor">
            <path d="M4 24 L20 18 L38 8 L40 12 L26 22 L36 28 L34 32 L18 26 L12 36 L8 34 L14 22 Z" opacity="0.95" />
          </svg>
        )}
        <span className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 rounded bg-white/90 px-1.5 py-px text-[9px] font-black text-teal-800">
          {shortName}
        </span>
      </div>
      <div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">{name}</h1>
        <p className="mt-1 text-sm text-teal-200/80">{shortName} · {tagline}</p>
      </div>
    </div>
  );
}
