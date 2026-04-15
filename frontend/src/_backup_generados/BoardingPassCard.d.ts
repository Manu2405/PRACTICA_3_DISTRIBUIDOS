import type { BoardingRecord, Language } from '../types';
type BoardingPassCardProps = {
    lang: Language;
    record: BoardingRecord;
    brandName: string;
    brandShort: string;
    onSimulateScan?: () => void;
};
export default function BoardingPassCard({ lang, record, brandName, brandShort, onSimulateScan }: BoardingPassCardProps): import("react/jsx-runtime").JSX.Element;
export {};
