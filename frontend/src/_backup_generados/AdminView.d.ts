import type { Aircraft, Conflict, EventLog, NodeStatus, Language } from '../types';
type AdminViewProps = {
    lang: Language;
    nodeStatuses: NodeStatus[];
    conflicts: Conflict[];
    eventLogs: EventLog[];
    aircrafts: Aircraft[];
    brandShort: string;
    brandName: string;
};
export default function AdminView({ lang, nodeStatuses, conflicts, eventLogs, aircrafts: initialAircrafts, brandShort, brandName, }: AdminViewProps): import("react/jsx-runtime").JSX.Element;
export {};
