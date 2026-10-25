import { useState } from 'react';
import { useStore } from '../store';
import { ARRANGEMENT_LABELS } from '../rules';
import type { Category, FinancingArrangement } from '../types';
import GroupCard from './GroupCard';
import StartHere from './Beginner';

const CATS: (Category | 'All')[] = ['All', 'Small business', 'Education', 'Home & community', 'Practice circle'];
const ARRANGEMENTS: (FinancingArrangement | 'All')[] = ['All', 'individual', 'shared-fund', 'joint'];

export default function Discover() {
  const { state } = useStore();
  const [cat, setCat] = useState<Category | 'All'>('All');
  const [q, setQ] = useState('');
  const [beginner, setBeginner] = useState(false);
  const [open, setOpen] = useState(true);
  const [arrangement, setArrangement] = useState<FinancingArrangement | 'All'>('All');

  const groups = Object.values(state.groups).filter((g) =>
    g.state !== 'closed' &&
    (cat === 'All' || g.category === cat) &&
    (arrangement === 'All' || g.arrangement === arrangement) &&
    (!beginner || g.beginnerFriendly) &&
    (!open || (g.state !== 'funded' && g.memberIds.length < g.maxMembers)) &&
    (g.name + g.description + g.goalTitle).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="row between wrap">
        <h1>Discover Groups</h1>
        <a className="btn primary" href="#/new">Create a group</a>
      </div>

      <StartHere onBrowseBeginner={() => setBeginner(true)} />

      <h2>Browse groups</h2>
      <div className="filters card">
        <input placeholder="Search groups" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search groups" />
        <select value={cat} onChange={(e) => setCat(e.target.value as Category | 'All')} aria-label="Purpose">{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={arrangement} onChange={(e) => setArrangement(e.target.value as FinancingArrangement | 'All')} aria-label="Financing arrangement">
          {ARRANGEMENTS.map((a) => <option key={a} value={a}>{a === 'All' ? 'Any arrangement' : ARRANGEMENT_LABELS[a]}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={beginner} onChange={(e) => setBeginner(e.target.checked)} /> Beginner friendly</label>
        <label className="check"><input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} /> Has space for new members</label>
      </div>
      <div className="grid">
        {groups.map((g) => <GroupCard key={g.id} g={g} />)}
        {!groups.length && <p className="muted">No groups match. Try clearing filters, or <a href="#/new">start one</a>.</p>}
      </div>
    </>
  );
}
