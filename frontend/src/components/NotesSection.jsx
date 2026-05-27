import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const NOTE_SEP = ' • ';
const POPOVER_WIDTH = 280;
const POPOVER_MAX_H = 320;
const POPOVER_GAP = 8;

function formatNoteTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseNote(note) {
  const idx = note.indexOf(NOTE_SEP);
  if (idx <= 0) return { timestamp: null, text: note };
  const timestamp = note.slice(0, idx);
  if (!/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(timestamp)) {
    return { timestamp: null, text: note };
  }
  return { timestamp, text: note.slice(idx + NOTE_SEP.length) };
}

function NoteItem({ note }) {
  const { timestamp, text } = parseNote(note);
  return (
    <li className="notes-popover-item">
      {timestamp && <span className="note-ts">{timestamp}</span>}
      <span className="notes-popover-text">{text}</span>
    </li>
  );
}

function AddNoteForm({ notes, onAddNote, onAdded }) {
  const [newNote, setNewNote] = useState('');

  const handleAdd = () => {
    const t = newNote.trim();
    if (!t || !onAddNote) return;
    const stamped = `${formatNoteTimestamp()}${NOTE_SEP}${t}`;
    onAddNote([...(notes || []), stamped]);
    setNewNote('');
    onAdded?.();
  };

  return (
    <div className="notes-add-row">
      <input
        type="text"
        placeholder="Add note..."
        value={newNote}
        onChange={(e) => setNewNote(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        className="app-input"
      />
      <button type="button" onClick={handleAdd} className="app-btn app-btn-primary app-btn-sm">
        Add
      </button>
    </div>
  );
}

function NotesPopover({ list, disabled, onAddNote, onClose, triggerRef }) {
  const popoverRef = useRef(null);
  const [style, setStyle] = useState({ top: 0, left: 0, maxHeight: POPOVER_MAX_H });

  const updatePosition = () => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverH = popover?.offsetHeight || POPOVER_MAX_H;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right - POPOVER_WIDTH;
    left = Math.max(POPOVER_GAP, Math.min(left, vw - POPOVER_WIDTH - POPOVER_GAP));

    const spaceBelow = vh - rect.bottom - POPOVER_GAP;
    const spaceAbove = rect.top - POPOVER_GAP;
    const openBelow = spaceBelow >= popoverH || spaceBelow >= spaceAbove;

    let top;
    let maxHeight;

    if (openBelow) {
      top = rect.bottom + POPOVER_GAP;
      maxHeight = Math.min(POPOVER_MAX_H, spaceBelow - POPOVER_GAP);
    } else {
      maxHeight = Math.min(POPOVER_MAX_H, spaceAbove - POPOVER_GAP);
      const height = Math.min(popoverH, maxHeight);
      top = rect.top - POPOVER_GAP - height;
      top = Math.max(POPOVER_GAP, top);
    }

    setStyle({ top, left, maxHeight: Math.max(120, maxHeight) });
  };

  useLayoutEffect(() => {
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);

    const onScroll = () => updatePosition();
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);

    const ro =
      popoverRef.current && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updatePosition)
        : null;
    if (popoverRef.current && ro) ro.observe(popoverRef.current);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
      ro?.disconnect();
    };
  }, [list.length]);

  return createPortal(
    <div
      ref={popoverRef}
      className="notes-popover notes-popover--fixed"
      role="dialog"
      aria-label="Lead notes"
      style={{
        position: 'fixed',
        top: style.top,
        left: style.left,
        width: POPOVER_WIDTH,
        maxHeight: style.maxHeight,
        zIndex: 9999,
      }}
    >
      <div className="notes-popover-header">
        <span>Notes {list.length > 0 && `(${list.length})`}</span>
        <button type="button" className="notes-popover-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {list.length > 0 ? (
        <ul className="notes-popover-list">
          {[...list].reverse().map((n, i) => (
            <NoteItem key={i} note={n} />
          ))}
        </ul>
      ) : (
        <p className="notes-popover-empty">No notes yet</p>
      )}
      {!disabled && <AddNoteForm notes={list} onAddNote={onAddNote} />}
    </div>,
    document.body
  );
}

export default function NotesSection({ notes = [], onAddNote, disabled, compact = false }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const list = Array.isArray(notes) ? notes : [];
  const latest = list.length > 0 ? parseNote(list[list.length - 1]).text : '';

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      const inTrigger = wrapRef.current?.contains(e.target);
      const inPopover = e.target.closest?.('.notes-popover--fixed');
      if (!inTrigger && !inPopover) setOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (compact) {
    return (
      <div className="notes-cell" ref={wrapRef}>
        <button
          ref={triggerRef}
          type="button"
          className="notes-cell-trigger"
          onClick={() => setOpen((v) => !v)}
          title={latest || 'Add a note'}
        >
          {list.length > 0 ? (
            <>
              <span className="notes-count-badge">{list.length}</span>
              <span className="notes-preview">{latest}</span>
            </>
          ) : (
            <span className="notes-preview notes-preview-empty">Add note</span>
          )}
        </button>
        {open && (
          <NotesPopover
            list={list}
            disabled={disabled}
            onAddNote={onAddNote}
            onClose={() => setOpen(false)}
            triggerRef={triggerRef}
          />
        )}
      </div>
    );
  }

  return (
    <div className="notes-full">
      {list.length > 0 && (
        <ul className="lead-notes-list">
          {list.map((n, i) => (
            <NoteItem key={i} note={n} />
          ))}
        </ul>
      )}
      {!disabled && <AddNoteForm notes={list} onAddNote={onAddNote} />}
    </div>
  );
}
