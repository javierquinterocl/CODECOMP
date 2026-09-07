

const Stroke = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
    {children}
  </svg>
);

export const HomeIcon   = () => <Stroke><path d="M3 11 12 3l9 8" /><path d="M5 10v11h14V10" /><path d="M10 21v-6h4v6" /></Stroke>;
export const PencilIcon = () => <Stroke><path d="M4 20h4L20 8l-4-4L4 16v4Z" /><path d="M14 6l4 4" /></Stroke>;
export const CpuIcon    = () => <Stroke><rect x="2" y="7" width="20" height="11" /><path d="M6 10v5M4 12.5h4M15 11h.01M18 14h.01" /></Stroke>;
export const TrophyIcon = () => <Stroke><path d="M7 3h10v6a5 5 0 0 1-10 0V3Z" /><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" /><path d="M12 14v4M8 21h8M9 21v-3h6v3" /></Stroke>;
export const BookIcon   = () => <Stroke><path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V4Z" /><path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6V4Z" /></Stroke>;
/* Diana: los retos diarios son el blanco al que se apunta cada día. */
export const TargetIcon = () => <Stroke><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></Stroke>;
export const UsersIcon  = () => <Stroke><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20" /><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M17.5 14h.5a4.5 4.5 0 0 1 4.5 4.5V20" /></Stroke>;
export const ReloadIcon = () => <Stroke><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 3.5V9h-5.5" /></Stroke>;
