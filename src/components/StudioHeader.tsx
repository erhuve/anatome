import { BookOpen, Info, RotateCcw } from 'lucide-react';
import BrandMark from './BrandMark';
import type { WorkspaceMode } from '../studyNavigation';
import type { ProgressPage } from '../progressNavigation';
import ProgressMenu from './ProgressMenu';

type Props = {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onSettings: () => void;
  onProgress: (page: ProgressPage) => void;
  progressPage?: ProgressPage | null;
  onAbout: () => void;
  signedIn: boolean;
  syncStatus: string;
  onNext: () => void;
  nextLabel: string;
  nextTitle: string;
};

export default function StudioHeader(props: Props) {
  return <header className="studio-header">
    <div className="studio-identity">
      <a className="studio-brand" href="/" aria-label="Anatomeme practice home"><BrandMark/><span>anatomeme</span></a>
      <nav className="workspace-switch" aria-label="Study or quiz mode">{(['study', 'quiz', 'memes'] as const).map(mode => <button key={mode} className={!props.progressPage && props.mode === mode ? 'active' : ''} aria-pressed={!props.progressPage && props.mode === mode} onClick={() => props.onModeChange(mode)}>{mode === 'study' ? 'Study' : mode === 'quiz' ? 'Quiz' : 'Memes'}</button>)}</nav>
    </div>
    <div className="header-actions">
      {!props.progressPage && props.mode !== 'memes' && <button className="browse-sections-button" aria-label="Browse sections" onClick={props.onSettings}><BookOpen size={16}/><span>Browse sections</span></button>}
      <ProgressMenu signedIn={props.signedIn} syncStatus={props.syncStatus} currentPage={props.progressPage} onNavigate={props.onProgress}/>
      {!props.progressPage && props.mode === 'quiz' && <button className="new-set-button" aria-label={props.nextTitle} onClick={props.onNext}><RotateCcw size={14}/><span>{props.nextLabel}</span></button>}
      <button className="icon-control" title="Help & sources" aria-label="Help & sources" onClick={props.onAbout}><Info size={17}/></button>
    </div>
  </header>;
}
