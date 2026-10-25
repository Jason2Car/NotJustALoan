import type { ReactNode } from 'react';
import { STATE_LABELS, STATE_ORDER } from '../rules';
import type { GroupState, Verification } from '../types';

export function VerifBadge({ label, v }: { label: string; v: Verification }) {
  const text = v === 'verified' ? 'verified' : v === 'self-reported' ? 'self-reported' : 'not provided';
  return <span className={`badge v-${v}`} title="Verification is not a credit or repayment signal.">{label}: {text}</span>;
}

export function Notice({ kind = 'info', title, children }: { kind?: 'info' | 'warn'; title?: string; children: ReactNode }) {
  return <div className={`notice ${kind}`}>{title && <strong>{title}</strong>}<div>{children}</div></div>;
}

export function StateTracker({ state }: { state: GroupState }) {
  const steps = STATE_ORDER.filter((s) => s !== 'closed');
  const cur = state === 'closed' ? steps.length : steps.indexOf(state);
  return (
    <ol className="tracker" aria-label="Group lifecycle">
      {steps.map((s, i) => (
        <li key={s} className={i < cur ? 'done' : i === cur ? 'current' : ''}>{STATE_LABELS[s]}</li>
      ))}
      {state === 'closed' && <li className="current">Closed</li>}
    </ol>
  );
}

export const Avatar = ({ name }: { name: string }) => (
  <span className="avatar" aria-hidden>{name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
);

export const money = (n: number) => '$' + n.toLocaleString();
