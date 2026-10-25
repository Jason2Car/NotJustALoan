import { Notice } from '../components/ui';

/**
 * "Start here" beginner pathway — a subsection of Discover Groups,
 * not a standalone section/page.
 */
export default function StartHere({ onBrowseBeginner }: { onBrowseBeginner: () => void }) {
  return (
    <section className="card" aria-labelledby="start-here-heading">
      <h2 id="start-here-heading">Start here: new here? Start small.</h2>
      <p>You don't need wealthy guarantors, collateral, or an existing network to take part. These steps are low-stakes and involve no money.</p>
      <ol className="steps">
        <li><strong>Browse beginner-friendly groups.</strong> Read their goals and rules first.</li>
        <li><strong>Introduce yourself.</strong> Answer a guided question and say hello in chat.</li>
        <li><strong>Try a low-stakes commitment.</strong> For example, attend two meetings. Accepting one is your own choice.</li>
        <li><strong>Learn the risks.</strong> Every group explains shared liability before any financial commitment.</li>
        <li><strong>Decide at your own pace.</strong> Nothing here obliges you to ever borrow.</li>
      </ol>
      <Notice title="Keeping promises builds familiarity, not a certificate">
        Showing up is a good way to get to know people. It is not proof that anyone can repay a loan, and we never present it that way.
      </Notice>
      <button className="primary" onClick={onBrowseBeginner}>Show beginner-friendly groups below</button>
    </section>
  );
}
