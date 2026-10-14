import { useEffect, useRef, type ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  /** Buttons am unteren Rand. */
  actions: ReactNode;
}

/** Modales Action Sheet auf Basis des nativen <dialog> (Fokus-Trap, Esc inklusive). */
export function Sheet({ open, title, onClose, children, actions }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sheet-title" onClose={onClose}>
      <h2 id="sheet-title">{title}</h2>
      {children}
      <div className="sheet__actions">{actions}</div>
    </dialog>
  );
}

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      title={title}
      onClose={onCancel}
      actions={
        <>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Sheet>
  );
}
