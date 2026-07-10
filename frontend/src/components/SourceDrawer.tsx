import { useEffect } from "react";

export interface SourcePanel {
  text: string;
  clause: string;
  circular?: string;
}

interface Props {
  source: SourcePanel | null;
  onClose: () => void;
}

export function SourceDrawer({ source, onClose }: Props) {
  const open = source !== null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 ease-precise ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-[400px] flex-col bg-surface shadow-drawer transition-transform duration-300 ease-precise ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {source && (
          <>
            <header className="flex items-center justify-between border-b border-hair px-5 py-4">
              <h2 className="font-serif text-lg text-ink">{source.clause}</h2>
              <button
                onClick={onClose}
                className="rounded p-1 text-muted transition-colors hover:bg-canvas hover:text-ink"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <blockquote className="border-l-2 border-gold/50 pl-4 text-sm leading-relaxed text-ink">
                {source.text}
              </blockquote>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
