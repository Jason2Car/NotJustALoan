import { describe, expect, it } from 'vitest';
import * as A from './actions';
import { advanceChecks, canAdvance, commitmentFullyAccepted, incomeVisibleTo, leaveKind } from './rules';
import { seedState } from './seed';

const as = (s: ReturnType<typeof seedState>, id: string) => { s.currentUserId = id; };

describe('consent and liability rules', () => {
  it('joining does not create commitment acknowledgments', () => {
    const s = seedState(); as(s, 'u-sam');
    A.requestJoin(s, 'g-cart', 'hi'); as(s, 'u-lena'); A.decideRequest(s, 'g-cart', 'u-sam', true);
    expect(s.groups['g-cart'].commitments.every((c) => !c.acks['u-sam'])).toBe(true);
  });
  it('a poll vote never writes an acknowledgment', () => {
    const s = seedState(); as(s, 'u-maya');
    A.proposeCommitment(s, 'g-oven', { title: 'x', description: '', kind: 'financial', maxExposure: 500 });
    A.createPoll(s, 'g-oven', 'Accept x?', ['yes', 'no']);
    const g = s.groups['g-oven']; A.vote(s, 'g-oven', g.polls.at(-1)!.id, 0);
    expect(g.commitments[0].acks).toEqual({});
  });
  it('owner cannot accept on behalf of another member', () => {
    const s = seedState(); as(s, 'u-maya');
    A.ackCommitment(s, 'g-cart', 'c1', 'accepted');
    const c = s.groups['g-cart'].commitments[0];
    expect(c.acks).toEqual({ 'u-maya': 'accepted' });
    expect(commitmentFullyAccepted(s.groups['g-cart'], c)).toBe(false);
  });
  it('membership change resets acknowledgments', () => {
    const s = seedState(); as(s, 'u-maya'); A.demoOthersRespond(s, 'g-cart'); A.ackCommitment(s, 'g-cart', 'c1', 'accepted');
    expect(commitmentFullyAccepted(s.groups['g-cart'], s.groups['g-cart'].commitments[0])).toBe(true);
    A.leaveGroup(s, 'g-cart', 'u-dev');
    expect(s.groups['g-cart'].commitments[0].acks).toEqual({});
  });
  it('cannot advance organizing -> ready until all accept', () => {
    const s = seedState(); as(s, 'u-lena'); const g = s.groups['g-cart'];
    expect(canAdvance(g)).toBe(false);
    A.ackCommitment(s, 'g-cart', 'c1', 'accepted'); A.demoOthersRespond(s, 'g-cart');
    expect(advanceChecks(g).every((b) => b.ok)).toBe(true);
    A.advance(s, 'g-cart'); expect(g.state).toBe('ready');
  });
  it('full flow reaches funded, and leaving is then blocked', () => {
    const s = seedState(); as(s, 'u-lena'); const g = s.groups['g-cart'];
    A.ackCommitment(s, 'g-cart', 'c1', 'accepted'); A.demoOthersRespond(s, 'g-cart'); A.advance(s, 'g-cart');
    A.chooseLender(s, 'g-cart', 'l1'); A.consentReferral(s, 'g-cart', true); A.demoOthersRespond(s, 'g-cart'); A.advance(s, 'g-cart');
    expect(g.state).toBe('submitted');
    A.simulateLenderDecision(s, 'g-cart', true); expect(g.state).toBe('funded');
    expect(leaveKind(g)).toBe('blocked'); A.leaveGroup(s, 'g-cart', 'u-lena'); expect(g.memberIds).toContain('u-lena');
  });
  it('income is private unless shared with that group', () => {
    const s = seedState(); const g = s.groups['g-cart']; const maya = s.users['u-maya'];
    expect(incomeVisibleTo(maya, 'u-lena', g)).toBe(false);
    as(s, 'u-maya'); A.setIncomeShare(s, 'g-cart', true);
    expect(incomeVisibleTo(s.users['u-maya'], 'u-lena', g)).toBe(true);
    expect(incomeVisibleTo(s.users['u-maya'], 'u-lena', s.groups['g-oven'])).toBe(false);
  });
});
