import { useState } from 'react';
import * as A from '../actions';
import { Notice } from '../components/ui';
import { go } from '../router';
import { ARRANGEMENT_EXPLAINERS, ARRANGEMENT_LABELS } from '../rules';
import { useStore } from '../store';
import type { Category, FinancingArrangement } from '../types';

export default function NewGroup() {
  const { update } = useStore();
  const [f, setF] = useState({ name: '', category: 'Small business' as Category, description: '', goalTitle: '', goalAmount: 5000, maxMembers: 5, beginnerFriendly: false, arrangement: 'individual' as FinancingArrangement });
  const [understoodJoint, setUnderstoodJoint] = useState(false);
  return (
    <form className="card narrow" onSubmit={(e) => { e.preventDefault(); let id = ''; update((d) => { id = A.createGroup(d, f); }); go('/group/' + id); }}>
      <h1>Create a group</h1>
      <label>Group name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label>Purpose<select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>
        {['Small business', 'Education', 'Home & community', 'Practice circle'].map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>What is the group about?<textarea required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <label>Shared goal<input required value={f.goalTitle} onChange={(e) => setF({ ...f, goalTitle: e.target.value })} /></label>
      <label>Target amount (USD, 0 for a no-money practice group)<input type="number" min={0} value={f.goalAmount} onChange={(e) => setF({ ...f, goalAmount: +e.target.value })} /></label>
      <label>Max members<input type="number" min={2} max={12} value={f.maxMembers} onChange={(e) => setF({ ...f, maxMembers: +e.target.value })} /></label>
      <label>Financing arrangement this group wants to explore
        <select value={f.arrangement} onChange={(e) => setF({ ...f, arrangement: e.target.value as FinancingArrangement })}>
          {(Object.keys(ARRANGEMENT_LABELS) as FinancingArrangement[]).map((a) => <option key={a} value={a}>{ARRANGEMENT_LABELS[a]}</option>)}
        </select>
      </label>
      <Notice kind={f.arrangement === 'joint' ? 'warn' : 'info'} title={ARRANGEMENT_LABELS[f.arrangement]}>{ARRANGEMENT_EXPLAINERS[f.arrangement]}</Notice>
      {f.arrangement === 'joint' && (
        <label className="check"><input type="checkbox" checked={understoodJoint} onChange={(e) => setUnderstoodJoint(e.target.checked)} /> I understand this only states what the group wants to explore. It binds nobody, and each member must separately accept any financial commitment after seeing the lender's actual terms.</label>
      )}
      <label className="check"><input type="checkbox" checked={f.beginnerFriendly} onChange={(e) => setF({ ...f, beginnerFriendly: e.target.checked })} /> Welcome beginners</label>
      <p className="muted">Creating a group collects no money and creates no financial obligation for anyone. Choosing an arrangement is a stated preference, not a contract.</p>
      <button className="primary" disabled={f.arrangement === 'joint' && !understoodJoint}>Create group</button>
    </form>
  );
}
