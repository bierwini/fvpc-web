import { useEffect, useRef, useState } from 'react';

export interface PopupMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  /** Gesetzt => Auswahl-Menü (Radio): genau ein Eintrag ist aktiv. */
  checked?: boolean;
  disabled?: boolean;
}

interface PopupMenuProps {
  label: string;
  items: PopupMenuItem[];
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
}

/** Button, der beim Klick eine Button-Gruppe nach OBEN öffnet (für Leisten am unteren Rand). */
export function PopupMenu({ label, items, align = 'start', disabled }: PopupMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="popup">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {label} ▾
      </button>
      {open && (
        <div className={`popup__menu popup__menu--${align}`} role="menu" aria-label={label}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={item.checked}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.checked !== undefined && (item.checked ? '● ' : '○ ')}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
