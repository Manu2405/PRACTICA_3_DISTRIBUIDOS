type BrandMarkProps = {
    name: string;
    tagline: string;
    shortName: string;
    /** Ruta pública, ej. `/image.png` en `public/` */
    iconSrc?: string;
};
export default function BrandMark({ name, tagline, shortName, iconSrc }: BrandMarkProps): import("react/jsx-runtime").JSX.Element;
export {};
