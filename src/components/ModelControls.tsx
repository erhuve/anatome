import { useEffect, useId, useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

/** Camera tools stay inline on desktop and open over the specimen on phones. */
export default function ModelControls({ children, resetKey }: { children: ReactNode; resetKey: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => setOpen(false), [resetKey]);
  return <div className={'model-controls' + (open ? ' is-open' : '')}>
    {open && <button className="model-controls-backdrop" aria-label="Close model controls" onClick={() => setOpen(false)}/>}
    <div className="model-controls-content" id={id}>{children}</div>
    <span className="model-touch-hint">Drag to rotate · pinch to zoom</span>
    <button className="model-controls-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      {open ? <X size={15}/> : <SlidersHorizontal size={15}/>}<span>{open ? 'Close controls' : 'View & layers'}</span>
    </button>
  </div>;
}
