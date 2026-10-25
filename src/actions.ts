import { advanceChecks, canAdvance, commitmentsEffective, nextState, resetAcks } from './rules';
import { uid } from './store';
import type { AppState, BudgetLineKind, Category, FinancingArrangement, Group, User } from './types';

type D = AppState;
const log = (g: Group, text: string) => g.log.push({ ts: Date.now(), text });
const name = (d: D, id: string) => d.users[id]?.name ?? 'Someone';

export function register(d: D, p: { name: string; bio: string; location: string; goal: string; experience: string; interests: string[]; beginner: boolean }) {
  const user: User = { id: 'u-' + uid(), ...p, identity: 'none', employment: 'none', sharedIncomeWith: [], records: [], finances: { lines: [] } };
  d.users[user.id] = user;
  d.currentUserId = user.id;
  return user.id;
}

export function createGroup(d: D, p: { name: string; category: Category; description: string; goalTitle: string; goalAmount: number; maxMembers: number; beginnerFriendly: boolean; arrangement?: FinancingArrangement }) {
  const me = d.currentUserId!;
  const g: Group = {
    id: 'g-' + uid(), ...p, arrangement: p.arrangement ?? 'individual', ownerId: me, state: 'forming', memberIds: [me], requests: [], rules: [], commitments: [], messages: [], polls: [],
    questions: [
      { id: uid(), prompt: 'What is your goal, and why does it matter to you?', answers: {} },
      { id: uid(), prompt: 'What would you do if a member could not make a planned contribution one month?', answers: {} },
      { id: uid(), prompt: 'How much risk are you comfortable with, in your own words?', answers: {} },
    ],
    log: [],
  };
  log(g, `Group created by ${name(d, me)}`);
  d.groups[g.id] = g;
  return g.id;
}

/** Requesting membership is social only: it creates no financial obligation. */
export function requestJoin(d: D, gid: string, intro: string) {
  const g = d.groups[gid], me = d.currentUserId!;
  if (g.memberIds.includes(me) || g.requests.some((r) => r.userId === me)) return;
  g.requests.push({ userId: me, intro });
}

export function decideRequest(d: D, gid: string, userId: string, approve: boolean) {
  const g = d.groups[gid];
  if (d.currentUserId !== g.ownerId) return;
  g.requests = g.requests.filter((r) => r.userId !== userId);
  if (approve && g.memberIds.length < g.maxMembers && !commitmentsEffective(g)) {
    g.memberIds.push(userId);
    resetAcks(g); // prior acknowledgments were about a different group
    log(g, `${name(d, userId)} joined. Earlier acknowledgments were reset because the group changed.`);
  }
}

/** Leaving is a social exit. It is blocked in-app after funding (see rules.leaveKind). */
export function leaveGroup(d: D, gid: string, userId: string) {
  const g = d.groups[gid];
  if (commitmentsEffective(g)) return;
  g.memberIds = g.memberIds.filter((m) => m !== userId);
  g.requests = g.requests.filter((r) => r.userId !== userId);
  resetAcks(g);
  if (userId === g.ownerId && g.memberIds.length) g.ownerId = g.memberIds[0];
  if (g.state === 'submitted') { g.state = 'organizing'; g.referral = undefined; log(g, 'Referral withdrawn because membership changed.'); }
  log(g, `${name(d, userId)} left. Acknowledgments were reset.`);
  if (!g.memberIds.length) { g.state = 'closed'; g.closedReason = 'inactive'; }
}

export function removeMember(d: D, gid: string, userId: string) {
  const g = d.groups[gid];
  if (d.currentUserId !== g.ownerId || userId === g.ownerId) return;
  leaveGroup(d, gid, userId);
}

export const postMessage = (d: D, gid: string, text: string, announcement = false) => {
  const g = d.groups[gid];
  g.messages.push({ id: uid(), userId: d.currentUserId!, text, ts: Date.now(), announcement: announcement && d.currentUserId === g.ownerId });
};

export const createPoll = (d: D, gid: string, question: string, options: string[]) => {
  d.groups[gid].polls.push({ id: uid(), question, options, votes: {}, closed: false });
};
export const vote = (d: D, gid: string, pid: string, idx: number) => {
  const p = d.groups[gid].polls.find((x) => x.id === pid);
  if (p && !p.closed) p.votes[d.currentUserId!] = idx;
};
export const closePoll = (d: D, gid: string, pid: string) => {
  const g = d.groups[gid], p = g.polls.find((x) => x.id === pid);
  if (p && d.currentUserId === g.ownerId) p.closed = true;
};
export const answerQuestion = (d: D, gid: string, qid: string, text: string) => {
  const q = d.groups[gid].questions.find((x) => x.id === qid);
  if (q) q.answers[d.currentUserId!] = text;
};
export const addQuestion = (d: D, gid: string, prompt: string) => { d.groups[gid].questions.push({ id: uid(), prompt, answers: {} }); };

export function addRule(d: D, gid: string, text: string) {
  const g = d.groups[gid];
  g.rules.push({ id: uid(), text });
  resetAcks(g);
  log(g, 'Rule added. Acknowledgments reset.');
}
export function removeRule(d: D, gid: string, rid: string) {
  const g = d.groups[gid];
  g.rules = g.rules.filter((r) => r.id !== rid);
  resetAcks(g);
}

export function proposeCommitment(d: D, gid: string, c: { title: string; description: string; kind: 'low-stakes' | 'financial'; maxExposure?: number }) {
  const g = d.groups[gid];
  if (commitmentsEffective(g)) return;
  g.commitments.push({ id: uid(), ...c, acks: {} });
  if (g.state === 'ready') g.state = 'organizing';
  log(g, `Commitment proposed: ${c.title}. Nobody is bound until they individually accept it.`);
}

/**
 * Only the current user can set their own decision. There is deliberately no
 * path where a vote or another member's action writes someone else's ack.
 */
export function ackCommitment(d: D, gid: string, cid: string, decision: 'accepted' | 'declined') {
  const g = d.groups[gid], c = g.commitments.find((x) => x.id === cid), me = d.currentUserId!;
  if (!c || !g.memberIds.includes(me)) return;
  c.acks[me] = decision;
}

export function setIncomeShare(d: D, gid: string, share: boolean) {
  const u = d.users[d.currentUserId!];
  u.sharedIncomeWith = u.sharedIncomeWith.filter((x) => x !== gid);
  if (share) u.sharedIncomeWith.push(gid);
}

export function advance(d: D, gid: string) {
  const g = d.groups[gid];
  const next = nextState(g.state);
  if (!next || !canAdvance(g) || d.currentUserId !== g.ownerId) return;
  g.state = next;
  if (next === 'submitted') g.referral!.submittedAt = Date.now();
  log(g, `Group moved to ${next}.`);
}

export function chooseLender(d: D, gid: string, lenderId: string) {
  const g = d.groups[gid];
  if (g.state !== 'ready' && g.state !== 'organizing') return;
  g.referral = { lenderId, consents: [] };
}

export function consentReferral(d: D, gid: string, consent: boolean) {
  const g = d.groups[gid], me = d.currentUserId!;
  if (!g.referral || !g.memberIds.includes(me)) return;
  g.referral.consents = g.referral.consents.filter((x) => x !== me);
  if (consent) g.referral.consents.push(me);
}

/** Lender decision preview. A real lender would underwrite each applicant. */
export function simulateLenderDecision(d: D, gid: string, approved: boolean) {
  const g = d.groups[gid];
  if (g.state !== 'submitted') return;
  if (approved) { g.state = 'funded'; log(g, 'Lender approved and funded. Commitments are now effective.'); }
  else { g.state = 'ready'; g.referral = undefined; log(g, 'Lender declined. Group returned to Ready to apply.'); }
}

export function closeGroup(d: D, gid: string, reason: 'completed' | 'cancelled' | 'inactive') {
  const g = d.groups[gid];
  if (d.currentUserId !== g.ownerId) return;
  g.state = 'closed'; g.closedReason = reason;
  log(g, `Group closed (${reason}).`);
}

/** Preview helper: other members' consent would come from them in a real app. */
export function demoOthersRespond(d: D, gid: string) {
  const g = d.groups[gid], me = d.currentUserId;
  for (const m of g.memberIds) {
    if (m === me) continue;
    g.commitments.forEach((c) => { if (!c.acks[m]) c.acks[m] = 'accepted'; });
    if (g.referral && !g.referral.consents.includes(m)) g.referral.consents.push(m);
    g.questions.forEach((q) => { if (!q.answers[m]) q.answers[m] = 'Happy to talk through it as a group.'; });
  }
  log(g, 'Other members responded.');
}

export const respondToRecord = (d: D, rid: string, response: string) => {
  const r = d.users[d.currentUserId!].records.find((x) => x.id === rid);
  if (r) r.response = response;
};
export const disputeRecord = (d: D, rid: string, text: string) => {
  const r = d.users[d.currentUserId!].records.find((x) => x.id === rid);
  if (r) r.dispute = { text, status: 'open' };
};
export const updateProfile = (d: D, patch: Partial<User>) => Object.assign(d.users[d.currentUserId!], patch);
export const requestVerification = (d: D) => { d.users[d.currentUserId!].identity = 'verified'; };

/**
 * Changing the financing arrangement changes what members may be asked to owe,
 * so — like a membership/rule change — it invalidates earlier acknowledgments.
 * Owner only, and never after funding.
 */
export function setArrangement(d: D, gid: string, arrangement: FinancingArrangement) {
  const g = d.groups[gid];
  if (!g || d.currentUserId !== g.ownerId || commitmentsEffective(g) || g.arrangement === arrangement) return;
  g.arrangement = arrangement;
  resetAcks(g);
  log(g, `Financing arrangement changed to "${arrangement}". Earlier acknowledgments were reset because the arrangement changed. Nobody is bound by this change alone.`);
}

// ---- My Finances (private to the user; no action shares this with a group) ----

const myFinances = (d: D) => {
  const u = d.users[d.currentUserId!];
  u.finances ??= { lines: [] };
  return u.finances;
};

export function setMonthlyIncome(d: D, amount: number | undefined) {
  myFinances(d).monthlyIncome = amount;
}

export function addBudgetLine(d: D, p: { label: string; amount: number; kind: BudgetLineKind }) {
  if (!p.label.trim() || !(p.amount > 0)) return;
  myFinances(d).lines.push({ id: uid(), ...p, label: p.label.trim() });
}

export function removeBudgetLine(d: D, lineId: string) {
  const f = myFinances(d);
  f.lines = f.lines.filter((l) => l.id !== lineId);
}

export { advanceChecks };
