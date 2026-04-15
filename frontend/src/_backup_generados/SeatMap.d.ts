import { Language, SeatStateType } from '../types';
type SeatMapProps = {
    lang: Language;
    seatMatrix: string[][];
    seatState: Record<string, SeatStateType>;
    selectedSeat: string | null;
    onSelectSeat: (seat: string) => void;
    firstClassSeats: number;
    columns: number;
};
export default function SeatMap({ lang, seatMatrix, seatState, selectedSeat, onSelectSeat, firstClassSeats, columns }: SeatMapProps): import("react/jsx-runtime").JSX.Element;
export declare function SeatStateLegend({ lang }: {
    lang: Language;
}): import("react/jsx-runtime").JSX.Element;
export {};
