import { useEffect, useRef, type ReactNode } from 'react';
import Icon from './Icon';
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const active = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previous; active?.focus(); };
  }, []);
  return <dialog ref={ref} className="app-dialog" aria-labelledby="dialog-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dialog-inner"><div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>{children}</div>
  </dialog>;
}
