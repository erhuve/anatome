import { ArrowUpRight, ChevronDown } from 'lucide-react';
import type { ModelPrompt } from '../modelQuiz';
import { mnemonicForPrompt } from '../mnemonics';

/** Only mount this after the structure's identity is visible to the learner. */
export default function AnatomyMnemonic({ prompt }: { prompt: ModelPrompt }) {
  const mnemonic = mnemonicForPrompt(prompt);
  if (!mnemonic) return null;

  return <details key={prompt.id} className="anatomy-mnemonic" onToggle={event => {
    const details = event.currentTarget;
    if (!details.open) return;
    const scroller = details.closest<HTMLElement>('.study-copy, .question-feedback');
    if (scroller && scroller.scrollHeight > scroller.clientHeight) {
      // Bring the expansion into the existing scroll area without moving the model or actions.
      scroller.scrollTop += details.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    }
  }}>
    <summary>
      <span className="anatomy-mnemonic-label">Mnemonic</span>
      <span className="anatomy-mnemonic-cue">{mnemonic.cue}</span>
      <ChevronDown size={14} aria-hidden="true"/>
    </summary>
    <div className="anatomy-mnemonic-body">
      <strong className="anatomy-mnemonic-title">{mnemonic.title}</strong>
      <ul>{mnemonic.lines.map(line => <li key={line}>{line}</li>)}</ul>
      {mnemonic.context && <p className="anatomy-mnemonic-context">{mnemonic.context}</p>}
      <a className="anatomy-mnemonic-source" href={mnemonic.source} target="_blank" rel="noreferrer">{mnemonic.sourceLabel}<ArrowUpRight size={12} aria-hidden="true"/></a>
    </div>
  </details>;
}
