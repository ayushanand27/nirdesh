import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  text: string;
  clause: string;
  onViewFull: () => void;
}

function truncateQuote(text: string, maxLen = 150): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen).trimEnd()}…`;
}

export function SourcePopover({
  anchorEl,
  open,
  onClose,
  text,
  clause,
  onViewFull,
}: Props) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorEl || !popRef.current) return;

    const anchor = anchorEl.getBoundingClientRect();
    const pop = popRef.current.getBoundingClientRect();
    const margin = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = anchor.bottom + margin;
    let left = anchor.left + anchor.width / 2 - pop.width / 2;
    left = Math.max(margin, Math.min(left, vw - pop.width - margin));

    if (top + pop.height > vh - margin) {
      top = anchor.top - pop.height - margin;
    }
    if (top < margin) {
      top = Math.max(margin, Math.min(anchor.top, vh - pop.height - margin));
    }

    // If still overflowing horizontally, anchor to cell's left edge.
    if (left + pop.width > vw - margin) {
      left = Math.max(margin, anchor.right - pop.width);
    }
    if (left < margin) {
      left = Math.min(margin, anchor.left);
    }

    setPos({ top, left });
  }, [open, anchorEl, text]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !anchorEl) return null;

  return createPortal(
    <div
      ref={popRef}
      className="fixed z-50 w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-card border border-gold/20 border-l-[3px] border-l-gold bg-elevated shadow-drawer"
      style={{ top: pos.top, left: pos.left }}
      onMouseLeave={onClose}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 border-b border-gold/15 px-3 py-1.5">
        <svg className="h-3 w-3 text-gold-700" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5.5 3C3.6 3 2 4.6 2 6.5c0 1.7 1.2 3.1 2.8 3.4-.1 1.3-.7 2.2-1.8 2.8l.6 1.3c2.1-1 3.4-2.8 3.4-5.6V6.5C7 4.6 5.4 3 5.5 3zm7 0C10.6 3 9 4.6 9 6.5c0 1.7 1.2 3.1 2.8 3.4-.1 1.3-.7 2.2-1.8 2.8l.6 1.3c2.1-1 3.4-2.8 3.4-5.6V6.5C14 4.6 12.4 3 12.5 3z" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gold">
          Source
        </span>
        <span className="ml-auto font-mono text-[9px] text-muted tnum">{clause}</span>
      </div>
      <div className="px-3 py-2">
        <p className="font-mono text-[11px] leading-relaxed text-ink">
          {truncateQuote(text)}
        </p>
        <button
          type="button"
          onClick={() => {
            onViewFull();
            onClose();
          }}
          className="mt-2 text-[11px] font-medium text-gold hover:text-gold-400 hover:underline"
        >
          View full source →
        </button>
      </div>
    </div>,
    document.body,
  );
}
