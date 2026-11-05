import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, History, LayoutDashboard, Smile, Trophy, UserRound } from 'lucide-react';
import { progressPages, progressUrl, type ProgressPage } from '../progressNavigation';

const icons = { overview: LayoutDashboard, history: History, review: BookOpen, memes: Smile, leaderboard: Trophy, account: UserRound };

export default function ProgressMenu({ signedIn, syncStatus, currentPage, onNavigate }: {
  signedIn: boolean; syncStatus: string; currentPage?: ProgressPage | null; onNavigate: (page: ProgressPage) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const lastItem = useRef(false);
  useEffect(() => {
    if (!open) return;
    const links = root.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]');
    (lastItem.current ? links?.[links.length - 1] : links?.[0])?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  return <div className="progress-menu-root" ref={root} onKeyDown={event => event.stopPropagation()} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button className={'account-button' + (currentPage ? ' is-current' : '')} ref={trigger} aria-label="My progress" aria-haspopup="menu" aria-expanded={open} aria-controls="progress-menu" onClick={() => { lastItem.current = false; setOpen(value => !value); }} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); lastItem.current = event.key === 'ArrowUp'; setOpen(true); }
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); }
    }}><UserRound size={15}/><span>My progress</span>{signedIn && <i className={'sync-dot ' + syncStatus} aria-label={syncStatus === 'synced' ? 'Progress synced' : 'Progress waiting to sync'}/>}<ChevronDown className="progress-menu-chevron" size={13}/></button>
    {open && <div className="progress-menu" id="progress-menu" role="menu" aria-label="My progress" onKeyDown={event => {
      const items = Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
      const index = items.indexOf(document.activeElement as HTMLAnchorElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    }}>
      <div className="progress-menu-caption">{signedIn ? 'Your practice' : 'Guest practice · this device'}</div>
      {progressPages.map(page => {
        const Icon = icons[page.id];
        return <a role="menuitem" key={page.id} href={progressUrl(window.location.href, page.id).toString()} aria-current={currentPage === page.id ? 'page' : undefined} onClick={event => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); setOpen(false); onNavigate(page.id);
        }}><Icon size={17}/><span>{page.label}<small>{page.description}</small></span></a>;
      })}
    </div>}
  </div>;
}
