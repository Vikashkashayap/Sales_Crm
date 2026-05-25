import React, { useState } from 'react';

export default function NotesSection({ notes = [], onAddNote, disabled }) {
  const [newNote, setNewNote] = useState('');
  const handleAdd = () => {
    const t = newNote.trim();
    if (t && onAddNote) {
      onAddNote([...(notes || []), t]);
      setNewNote('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.isArray(notes) && notes.length > 0 && (
        <ul className="muted-text" style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Add note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            className="app-input"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button type="button" onClick={handleAdd} className="app-btn app-btn-primary" style={{ flexShrink: 0 }}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}
