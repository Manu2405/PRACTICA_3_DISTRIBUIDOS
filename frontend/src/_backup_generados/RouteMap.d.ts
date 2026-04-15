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
export default function RouteMap({ cities, origin, destination, selectedRoute, className, isExpanded, }: RouteMapProps): import("react/jsx-runtime").JSX.Element;
export {};
