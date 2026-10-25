import type { AppState, Group, ReliabilityRecord, User } from './types';

const d = (daysAgo: number) => new Date(Date.UTC(2026, 9, 24) - daysAgo * 864e5).toISOString().slice(0, 10);
const rec = (id: string, kind: ReliabilityRecord['kind'], daysAgo: number, title: string, context: string, extra: Partial<ReliabilityRecord> = {}): ReliabilityRecord => ({
  id, kind, date: d(daysAgo), title, context, ...extra,
});

const u = (x: Partial<User> & Pick<User, 'id' | 'name'>): User => ({
  bio: '', location: 'Austin, TX', interests: [], goal: '', experience: '',
  identity: 'none', employment: 'none', sharedIncomeWith: [], beginner: false, records: [], finances: { lines: [] }, ...x,
});

const fin = (monthlyIncome: number, lines: [string, number, 'essential' | 'other' | 'existing-loan'][]): User['finances'] => ({
  monthlyIncome,
  lines: lines.map(([label, amount, kind], i) => ({ id: `b-${label.slice(0, 4)}-${i}`, label, amount, kind })),
});

export const seedUsers: User[] = [
  u({ id: 'u-maya', name: 'Maya Okafor', bio: 'Home baker turning weekend orders into a storefront.', interests: ['food', 'small business'], goal: 'Buy a commercial oven and rent a shared kitchen', experience: '3 years of farmers-market sales', identity: 'verified', employment: 'self-reported', income: 28000, beginner: false,
    finances: fin(2333, [['Rent share', 850, 'essential'], ['Groceries', 320, 'essential'], ['Utilities & phone', 140, 'essential'], ['Transport', 110, 'other'], ['Ingredients stock', 260, 'other']]),
    records: [rec('r1', 'completed', 60, 'Paid into a practice savings pot on time', 'Four monthly $10 practice contributions in a practice circle.'), rec('r2', 'delayed-explained', 25, 'One check-in delayed', 'Missed a weekly check-in during a family emergency.', { response: 'Told the group beforehand and caught up the next week.' }), rec('r8', 'completed', 90, 'Repaid a small equipment loan as agreed', 'Repaid $600 over 6 monthly payments of $100, all on time.'), rec('r9', 'late', 45, 'Missed a repayment, then repaid in full', 'Missed one $75 repayment after her market stall hours were cut, told the group the same week, and repaid in full 3 weeks late. The delay is recorded with context, not as misconduct.', { response: 'My hours were cut that month. I told everyone early and caught up in full.' })] }),
  u({ id: 'u-dev', name: 'Dev Raman', bio: 'Line cook saving for a food-truck.', interests: ['food', 'small business'], goal: 'Fund a used food truck', experience: '8 years in restaurant kitchens', identity: 'verified', employment: 'verified', income: 36000,
    finances: fin(3000, [['Rent', 1050, 'essential'], ['Groceries', 380, 'essential'], ['Utilities & phone', 160, 'essential'], ['Car payment (existing loan)', 240, 'existing-loan'], ['Eating out', 150, 'other']]),
    records: [rec('r3', 'completed', 40, 'Hosted a group meeting as agreed', 'Organised two planning meetings.'), rec('r4', 'late', 15, 'Late on a shared-expense reminder', 'Reimbursed a $15 shared supply cost 6 days late.', { dispute: { text: 'The reminder was sent to the wrong chat; I did not see it.', status: 'open' } }), rec('r10', 'completed', 120, 'Repaid a shared kitchen-equipment share as agreed', 'Repaid his $450 share of a shared-equipment purchase in 3 monthly instalments, all on time.'), rec('r11', 'unresolved', 30, 'One repayment still outstanding', 'A $60 repayment toward a shared purchase is 2 weeks overdue and not yet repaid. Recorded as unresolved and open — the group has not yet agreed a new date.', { response: 'I can pay half this week and the rest next payday; waiting for the group to agree.' })] }),
  u({ id: 'u-lena', name: 'Lena Brandt', bio: 'Part-time barista with a plan for a coffee cart.', interests: ['food', 'small business'], goal: 'Start a mobile coffee cart', experience: 'Barista; managed a campus kiosk', identity: 'self-reported', employment: 'self-reported', income: 24000, finances: fin(2000, [['Rent share', 700, 'essential'], ['Groceries', 280, 'essential'], ['Utilities & phone', 120, 'essential'], ['Transport', 90, 'other'], ['Course fees', 60, 'other']]), records: [rec('r12', 'completed', 75, 'Repaid a course-fee loan as agreed', 'Repaid $400 over 4 monthly payments, all on time.'), rec('r13', 'late', 35, 'Failed to repay on time, repaid late', 'Missed a $50 repayment toward shared coffee-cart supplies and repaid it 10 days late after a shift was cancelled.', { response: 'My shift was cancelled that week. I repaid as soon as I was paid, and I now keep a small buffer.' })] }),
  u({ id: 'u-sam', name: 'Sam Torres', bio: 'Night-shift worker studying to become a dental hygienist.', interests: ['education', 'health'], goal: 'Cover hygienist program tuition', experience: 'Dental assistant for 2 years', identity: 'verified', employment: 'self-reported', income: 31000,
    records: [rec('r5', 'renegotiated', 50, 'Renegotiated a shared textbook purchase', 'Group agreed to split the cost differently after a schedule change.'), rec('r6', 'completed', 20, 'Completed practice commitment', 'Attended all 4 study-circle sessions.'), rec('r14', 'completed', 100, 'Repaid a tuition instalment plan as agreed', 'Repaid $900 over 9 monthly payments, all on time.'), rec('r15', 'delayed-explained', 55, 'Repayment delayed, explained and repaid', 'A $100 repayment was 2 weeks late during a family emergency; he told the group in advance and repaid in full on the agreed new date.', { response: 'I flagged it before the due date and paid on the new date we agreed.' })] }),
  u({ id: 'u-priya', name: 'Priya Nair', bio: 'Community organiser and first-time borrower.', interests: ['education', 'community'], goal: 'Complete a project-management certificate', experience: 'Volunteer coordinator', identity: 'verified', employment: 'none', records: [rec('r7', 'unresolved', 10, 'Open question on supply split', 'Group has not settled how to split a $40 supply purchase.'), rec('r16', 'completed', 80, 'Repaid a certificate-course share as agreed', 'Repaid $300 over 3 monthly payments toward a shared course purchase, all on time.'), rec('r17', 'late', 65, 'Missed a repayment and has not yet caught up', 'Missed a $40 repayment 3 weeks ago and has not yet repaid it; she told the group she is waiting on delayed wages. Recorded as late with her explanation, not as a character judgement.', { response: 'My wages were delayed. I expect to catch up this month and will update the group weekly.' })] }),
  u({ id: 'u-omar', name: 'Omar Haddad', bio: 'New to the area, no local network yet.', interests: ['community', 'home'], goal: 'Learn how group financing works', experience: 'None yet', identity: 'none', employment: 'none', beginner: true, records: [rec('r18', 'completed', 12, 'Completed a low-stakes practice commitment', 'Attended both First Steps Practice Circle meetings he signed up for. No money was involved, and this says nothing about repaying a loan.')] }),
];

const msg = (id: string, userId: string, text: string, mins: number, announcement = false) => ({ id, userId, text, ts: Date.UTC(2026, 9, 24, 12) - mins * 60e3, announcement });

const baseLog = (text: string) => [{ ts: Date.UTC(2026, 9, 20), text }];

export const seedGroups: Group[] = [
  {
    id: 'g-oven', name: 'Neighborhood Kitchen Collective', category: 'Small business',
    description: 'Food entrepreneurs pooling plans to seek a shared-kitchen and equipment loan from a lender. Each member borrows only what they individually agree to.',
    goalTitle: 'Shared-kitchen equipment fund', goalAmount: 18000, arrangement: 'shared-fund', beginnerFriendly: false, maxMembers: 5, ownerId: 'u-maya', state: 'forming',
    memberIds: ['u-maya', 'u-dev'], requests: [],
    rules: [{ id: 'gr1', text: 'Be honest about your budget; nobody is pressured to share income.' }],
    commitments: [],
    messages: [msg('m1', 'u-maya', 'Welcome! Looking for two or three more people with real kitchen experience.', 180, true), msg('m2', 'u-dev', 'Happy to host the first planning meeting.', 150)],
    polls: [{ id: 'p1', question: 'Preferred meeting night?', options: ['Tuesday', 'Thursday', 'Sunday'], votes: { 'u-maya': 1 }, closed: false }],
    questions: [
      { id: 'q1', prompt: 'What would you do if a member could not make a planned contribution one month?', answers: { 'u-maya': 'Talk early and agree a plan. No surprises.' } },
      { id: 'q2', prompt: 'How much risk are you comfortable with, in your own words?', answers: {} },
    ], log: baseLog('Group created by Maya Okafor'),
  },
  {
    id: 'g-cart', name: 'Coffee Cart Crew', category: 'Small business',
    description: 'Three people with a plan for a coffee cart and a trailer. Already working through rules and commitments.',
    goalTitle: 'Coffee cart + trailer', goalAmount: 12000, arrangement: 'joint', beginnerFriendly: false, maxMembers: 4, ownerId: 'u-lena', state: 'organizing',
    memberIds: ['u-lena', 'u-dev', 'u-maya'], requests: [],
    rules: [{ id: 'gr2', text: 'Missed commitments are discussed within 7 days (grace period).' }],
    commitments: [{ id: 'c1', title: 'Weekly planning check-in', description: 'Attend or message before the weekly call.', kind: 'low-stakes', acks: {} }],
    messages: [msg('m3', 'u-lena', 'Draft rules are in the Rules tab, please edit!', 90, true)],
    polls: [], questions: [{ id: 'q3', prompt: 'What is your maximum comfortable individual exposure, if any?', answers: { 'u-lena': 'Not above $2,000 each, and I need to hear it in writing.' } }],
    log: baseLog('Group created by Lena Brandt'),
  },
  {
    id: 'g-study', name: 'Hygienist Study Circle', category: 'Education',
    description: 'Students and career-changers supporting each other toward tuition borrowing. Smaller amounts, individual loans, shared planning.',
    goalTitle: 'Program tuition (individual loans, shared planning)', goalAmount: 9000, arrangement: 'individual', beginnerFriendly: true, maxMembers: 6, ownerId: 'u-sam', state: 'forming',
    memberIds: ['u-sam', 'u-priya'], requests: [], rules: [], commitments: [],
    messages: [msg('m4', 'u-sam', 'Beginners welcome. We start with study sessions, no money involved.', 300, true)],
    polls: [], questions: [{ id: 'q4', prompt: 'What are you hoping to learn from a group like this?', answers: {} }],
    log: baseLog('Group created by Sam Torres'),
  },
  {
    id: 'g-practice', name: 'First Steps Practice Circle', category: 'Practice circle',
    description: 'A no-money starter group. Show up, keep small promises like attending a meeting or sharing a budget worksheet, and get comfortable working with others. This is not a certification of anything.',
    goalTitle: 'Practice working together (no money)', goalAmount: 0, arrangement: 'individual', beginnerFriendly: true, maxMembers: 8, ownerId: 'u-priya', state: 'forming',
    memberIds: ['u-priya'], requests: [], rules: [{ id: 'gr3', text: 'No money moves in this group. Ever.' }],
    commitments: [{ id: 'c2', title: 'Attend two monthly meetings', description: 'A low-stakes habit. Life happens; tell the group if you can\'t.', kind: 'low-stakes', acks: {} }],
    messages: [msg('m5', 'u-priya', 'Introduce yourself! Share one goal and one worry.', 400, true)],
    polls: [], questions: [{ id: 'q5', prompt: 'What is one goal you would like financing for someday?', answers: {} }], log: baseLog('Group created by Priya Nair'),
  },
];

export const seedState = (): AppState => ({
  users: Object.fromEntries(seedUsers.map((x) => [x.id, x])),
  groups: Object.fromEntries(seedGroups.map((g) => [g.id, structuredClone(g)])),
  currentUserId: null,
});
