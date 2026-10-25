import { money, StateTracker } from '../components/ui';
import { ARRANGEMENT_LABELS, arrangementConsidersSharedLiability, STATE_LABELS } from '../rules';
import type { Group } from '../types';
import { useStore } from '../store';

export default function GroupCard({ g }: { g: Group }) {
  const { state } = useStore();
  const me = state.currentUserId;
  return (
    <a className="card group-card" href={`#/group/${g.id}`}>
      <div className="row between">
        <span className="badge">{g.category}</span>
        <span className="badge state">{STATE_LABELS[g.state]}</span>
      </div>
      <h3>{g.name}</h3>
      <p>{g.description}</p>
      <p className="muted">Goal: {g.goalTitle}{g.goalAmount > 0 && ` (${money(g.goalAmount)})`}</p>
      <p className="muted">Financing arrangement: <strong>{ARRANGEMENT_LABELS[g.arrangement]}</strong>{arrangementConsidersSharedLiability(g.arrangement) ? ' — shared liability is being considered; read the warning on the group page before accepting anything.' : ' — joining does not guarantee loan approval or better rates.'}</p>
      <div className="row between">
        <span className="muted">{g.memberIds.length}/{g.maxMembers} members</span>
        {g.beginnerFriendly && <span className="badge good">Beginner friendly</span>}
        {me && g.memberIds.includes(me) && <span className="badge">You're in</span>}
      </div>
      <StateTracker state={g.state} />
    </a>
  );
}
