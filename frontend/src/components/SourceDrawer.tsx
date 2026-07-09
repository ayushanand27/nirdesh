import { useEffect } from "react";
import { formatClause } from "../lib/status";

export interface SourcePanel {
  text: string;
  clause: string;
  circular?: string;
}

interface Props {
  source: SourcePanel | null;
  onClose: () => void;
}

/** Source citation only — no obligation / threshold duplication. */
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
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-[420px] flex-col bg-surface shadow-drawer transition-transform duration-300 ease-precise ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {source && (
          <>
            <header className="flex items-start justify-between border-b border-hair px-6 py-5">
              <div>
                <div className="label-caps">Source citation</div>
                <h2 className="mt-1 font-serif text-lg text-ink">{source.clause}</h2>
              </div>
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
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <blockquote className="border-l-2 border-gold/50 pl-4 text-sm leading-relaxed text-ink">
                {source.text}
              </blockquote>
              <dl className="mt-5 space-y-2 border-t border-hair/40 pt-4 text-xs">
                <div className="grid grid-cols-[5rem_1fr] gap-x-3">
                  <dt className="text-muted">Clause</dt>
                  <dd className="text-ink">{formatClause(source.clause.replace(/^§\s*/, ""))}</dd>
                </div>
                {source.circular && (
                  <div className="grid grid-cols-[5rem_1fr] gap-x-3">
                    <dt className="text-muted">Circular</dt>
                    <dd className="break-all text-ink">{source.circular}</dd>
                  </div>
                )}
              </dl>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
