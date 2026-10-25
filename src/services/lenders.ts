import type { Lender } from '../types';

/**
 * Lender directory. A real integration would replace this with an API client
 * exposing the same `listLenders` shape. (Covered by the app's top banner.)
 */
const LENDERS: Lender[] = [
  {
    id: 'l1',
    name: 'Prairie Community Credit',
    blurb: 'A community lender that reviews small-business requests from groups, with each member underwritten individually.',
    categories: ['Small business', 'Home & community'],
    minAmount: 5000,
    maxAmount: 40000,
    minMembers: 3,
    maxMembers: 8,
    requirements: ['Each borrower completes the lender\'s own application', 'Lender runs its own checks', 'No guarantee of approval'],
    asks: ['Group name and goal', 'Member names', 'Identity verification status', 'Group rules summary'],
  },
  {
    id: 'l2',
    name: 'Lantern Learning Fund',
    blurb: 'An education-focused lender offering small tuition and certification loans.',
    categories: ['Education'],
    minAmount: 1000,
    maxAmount: 15000,
    minMembers: 2,
    maxMembers: 6,
    requirements: ['Enrollment documentation', 'Lender runs its own checks', 'No guarantee of approval'],
    asks: ['Group name and goal', 'Member names', 'Identity verification status'],
  },
  {
    id: 'l3',
    name: 'Common Ground Microlending',
    blurb: 'A nonprofit microlender open to many purposes. Smaller amounts, longer reviews.',
    categories: ['Small business', 'Education', 'Home & community'],
    minAmount: 500,
    maxAmount: 10000,
    minMembers: 3,
    maxMembers: 10,
    requirements: ['Short financial-education session', 'Lender runs its own checks', 'No guarantee of approval'],
    asks: ['Group name and goal', 'Member names', 'Group rules summary', 'Commitment list (no personal income unless a member opts in)'],
  },
];

export const listLenders = (): Lender[] => LENDERS;
export const getLender = (id: string) => LENDERS.find((l) => l.id === id);
