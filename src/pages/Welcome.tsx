import { useState } from 'react';
import * as A from '../actions';
import { Avatar, Notice } from '../components/ui';
import { go } from '../router';
import { useStore } from '../store';

export default function Welcome() {
  const { state, update } = useStore();
  const [f, setF] = useState({ name: '', bio: '', location: 'Austin, TX', goal: '', experience: '', interests: '', beginner: true });
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="welcome">
      <h1>Not Just a Loan</h1>
      <p className="tagline">Find your people. Fund your goals.</p>
      <Notice title="How this works">
        Pick a person below (or create a profile) to explore. No real money moves and nothing here checks credit or promises a loan.
      </Notice>

      <section className="card">
        <h2>Try it as one of these people</h2>
        <div className="grid">
          {Object.values(state.users).map((u) => (
            <button key={u.id} className="persona" onClick={() => { update((d) => { d.currentUserId = u.id; }); go('/'); }}>
              <Avatar name={u.name} />
              <span><strong>{u.name}</strong><br /><small>{u.goal}</small></span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Or create your profile</h2>
        <form onSubmit={(e) => { e.preventDefault(); if (!f.name.trim()) return; update((d) => { A.register(d, { ...f, interests: f.interests.split(',').map((s) => s.trim()).filter(Boolean) }); }); go('/'); }}>
          <label>Name<input value={f.name} onChange={(e) => set('name', e.target.value)} required /></label>
          <label>About you<textarea value={f.bio} onChange={(e) => set('bio', e.target.value)} /></label>
          <label>Your goal<input value={f.goal} onChange={(e) => set('goal', e.target.value)} placeholder="e.g. Start a mobile coffee cart" /></label>
          <label>Relevant experience<input value={f.experience} onChange={(e) => set('experience', e.target.value)} /></label>
          <label>Interests (comma separated)<input value={f.interests} onChange={(e) => set('interests', e.target.value)} /></label>
          <label className="check"><input type="checkbox" checked={f.beginner} onChange={(e) => set('beginner', e.target.checked)} /> I'm new to this and have no financial network yet. Point me to the Start here subsection in Discover Groups.</label>
          <p className="muted">Your income stays private. You choose later whether to share it, and with which group. Leaving it blank is fine and is never held against you.</p>
          <button className="primary">Create profile</button>
        </form>
      </section>
    </div>
  );
}
