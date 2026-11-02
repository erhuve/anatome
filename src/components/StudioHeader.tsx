import { Info, RotateCcw, SlidersHorizontal, UserRound } from 'lucide-react';
import BrandMark from './BrandMark';
import type { ModelCollection } from '../modelQuiz';
import type { WorkspaceMode } from '../studyNavigation';

type Props = {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  collection: ModelCollection;
  onCollectionChange: (collection: ModelCollection) => void;
  onSettings: () => void;
  onProgress: () => void;
  onAbout: () => void;
  signedIn: boolean;
  syncStatus: string;
  onNext: () => void;
  nextLabel: string;
  nextTitle: string;
};
const collections = [{ id: 'muscles', label: 'Muscles' }, { id: 'skeleton', label: 'Bones' }, { id: 'landmarks', label: 'Landmarks' }] as const;

export default function StudioHeader(props: Props) {
  return <header className="studio-header">
    <div className="studio-identity">
      <a className="studio-brand" href="/" aria-label="Anatomeme practice home"><BrandMark/><span>anatomeme</span></a>
      <nav className="workspace-switch" aria-label="Study or quiz mode">{(['study', 'quiz'] as const).map(mode => <button key={mode} className={props.mode === mode ? 'active' : ''} aria-pressed={props.mode === mode} onClick={() => props.onModeChange(mode)}>{mode === 'study' ? 'Study' : 'Quiz'}</button>)}</nav>
    </div>
    <nav className="collection-switch" aria-label="Choose anatomy collection">{collections.map(item => <button key={item.id} className={props.collection === item.id ? 'active' : ''} aria-pressed={props.collection === item.id} onClick={() => { if (props.collection !== item.id) props.onCollectionChange(item.id); }}>{item.label}</button>)}</nav>
    <div className="header-actions">
      <button className="study-settings-button" aria-label="Study settings" title="Choose regions and structures" onClick={props.onSettings}><SlidersHorizontal size={15}/><span>Study settings</span></button>
      <button className="account-button" onClick={props.onProgress} aria-label={props.signedIn ? 'My progress and account' : 'Sign in and view progress'}><UserRound size={15}/><span>{props.signedIn ? 'My progress' : 'Sign in'}</span>{props.signedIn && <i className={'sync-dot ' + props.syncStatus} aria-label={props.syncStatus === 'synced' ? 'Progress synced' : 'Progress waiting to sync'}/>}</button>
      {props.mode === 'quiz' && <button className="new-set-button" aria-label={props.nextTitle} onClick={props.onNext}><RotateCcw size={14}/><span>{props.nextLabel}</span></button>}
      <button className="icon-control" title="Specimen sources and controls" aria-label="Specimen sources and controls" onClick={props.onAbout}><Info size={17}/></button>
    </div>
  </header>;
}
