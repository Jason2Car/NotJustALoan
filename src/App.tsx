import { go, useRoute } from './router';
import { useStore } from './store';
import Welcome from './pages/Welcome';
import Community from './pages/Community';
import Discover from './pages/Discover';
import GroupPage from './pages/GroupPage';
import Profile from './pages/Profile';
import MyGroups from './pages/MyGroups';
import NewGroup from './pages/NewGroup';
import Finances from './pages/Finances';

/** The one place that says it: everything in this app is simulated. */
export const SimulationBanner = () => (
  <div className="demo-banner" role="note">
    Everything here is <strong>simulated</strong> — people, groups, lenders, records, verification, and money. No real money moves, no credit checks, and nothing is a real loan or offer.
  </div>
);

export default function App() {
  const { state, update, reset } = useStore();
  const route = useRoute();
  const me = state.currentUserId ? state.users[state.currentUserId] : null;

  if (!me) return <><SimulationBanner /><Welcome /></>;

  const [page, id] = route;
  const view =
    page === 'group' && id ? <GroupPage id={id} /> :
    page === 'profile' ? <Profile id={id ?? me.id} /> :
    page === 'community' ? <Community /> :
    page === 'finances' ? <Finances /> :
    page === 'mine' ? <MyGroups /> :
    page === 'new' ? <NewGroup /> :
    <Discover />;

  return (
    <>
      <SimulationBanner />
      <header className="top">
        <a href="#/" className="brand">Not Just a Loan</a>
        <nav aria-label="Main sections">
          <a href="#/community" aria-current={page === 'community' ? 'page' : undefined}>Community</a>
          <a href="#/" aria-current={!page ? 'page' : undefined}>Discover Groups</a>
          <a href="#/mine" aria-current={page === 'mine' ? 'page' : undefined}>My Groups</a>
          <a href="#/finances" aria-current={page === 'finances' ? 'page' : undefined}>My Finances</a>
          <a href="#/profile">Profile</a>
        </nav>
        <div className="who">
          <label className="sr">Switch person</label>
          <select value={me.id} onChange={(e) => update((d) => { d.currentUserId = e.target.value; })} title="Switch person">
            {Object.values(state.users).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="link" onClick={() => update((d) => { d.currentUserId = null; })}>Sign out</button>
          <button className="link" onClick={() => { if (confirm('Reset all data?')) { reset(); go('/'); } }}>Reset</button>
        </div>
      </header>
      <main>{view}</main>
      <footer>Not Just a Loan · Find your people. Fund your goals. · We help groups form and decide. Lenders, not us, decide on credit.</footer>
    </>
  );
}
