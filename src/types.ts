export type Verification = 'verified' | 'self-reported' | 'none';

export type RecordKind =
  | 'completed'
  | 'late'
  | 'delayed-explained'
  | 'renegotiated'
  | 'unresolved'
  | 'disputed';

export interface ReliabilityRecord {
  id: string;
  kind: RecordKind;
  date: string;
  title: string;
  context: string;
  /** The subject's own response, shown next to the record. */
  response?: string;
  dispute?: { text: string; status: 'open' | 'corrected' };
}

export interface User {
  id: string;
  name: string;
  bio: string;
  location: string;
  interests: string[];
  goal: string;
  experience: string;
  identity: Verification;
  employment: Verification;
  /** Annual income. Private unless listed in sharedIncomeWith. */
  income?: number;
  sharedIncomeWith: string[]; // group ids
  beginner: boolean;
  records: ReliabilityRecord[];
  /** Private by default. Only the owner sees/edits this; never shared with a group. */
  finances?: PersonalFinances;
}

export type Category = 'Small business' | 'Education' | 'Home & community' | 'Practice circle';

/** Which financing arrangement a group wants to explore. A preference, not a contract. */
export type FinancingArrangement = 'individual' | 'shared-fund' | 'joint';

export type BudgetLineKind = 'essential' | 'other' | 'existing-loan';

export interface BudgetLine {
  id: string;
  label: string;
  /** Monthly amount in USD, user-entered. */
  amount: number;
  kind: BudgetLineKind;
}

export interface PersonalFinances {
  /** Monthly take-home income in USD, user-entered. Not derived from any loan. */
  monthlyIncome?: number;
  lines: BudgetLine[];
}

export type GroupState =
  | 'forming'
  | 'organizing'
  | 'ready'
  | 'submitted'
  | 'funded'
  | 'closed';

export interface Rule {
  id: string;
  text: string;
}

export interface Commitment {
  id: string;
  title: string;
  description: string;
  kind: 'low-stakes' | 'financial';
  /** Maximum amount (USD) one member could be exposed to. Financial only. */
  maxExposure?: number;
  /** userId -> decision. Only an individual's own action can set their entry. */
  acks: Record<string, 'accepted' | 'declined'>;
}

export interface Message {
  id: string;
  userId: string;
  text: string;
  ts: number;
  announcement?: boolean;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  closed: boolean;
}

export interface GuidedQuestion {
  id: string;
  prompt: string;
  answers: Record<string, string>;
}

export interface JoinRequest {
  userId: string;
  intro: string;
}

export interface Group {
  id: string;
  name: string;
  category: Category;
  description: string;
  goalTitle: string;
  goalAmount: number;
  arrangement: FinancingArrangement;
  beginnerFriendly: boolean;
  maxMembers: number;
  ownerId: string;
  state: GroupState;
  closedReason?: 'completed' | 'cancelled' | 'inactive' | 'declined';
  memberIds: string[];
  requests: JoinRequest[];
  rules: Rule[];
  commitments: Commitment[];
  messages: Message[];
  polls: Poll[];
  questions: GuidedQuestion[];
  referral?: { lenderId: string; consents: string[]; submittedAt?: number };
  log: { ts: number; text: string }[];
}

export interface Lender {
  id: string;
  name: string;
  blurb: string;
  categories: Category[];
  minAmount: number;
  maxAmount: number;
  minMembers: number;
  maxMembers: number;
  requirements: string[];
  /** Fields this lender would ask the group to share. */
  asks: string[];
}

export interface AppState {
  users: Record<string, User>;
  groups: Record<string, Group>;
  currentUserId: string | null;
}
