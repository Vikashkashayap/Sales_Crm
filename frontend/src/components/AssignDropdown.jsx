import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const ASSIGNEE_PALETTE = [
  { bg: '#EFF6FF', color: '#1D4ED8', border: '#93C5FD', dot: '#2563EB' },
  { bg: '#F0FDF4', color: '#15803D', border: '#86EFAC', dot: '#16A34A' },
  { bg: '#FAF5FF', color: '#6D28D9', border: '#C4B5FD', dot: '#7C3AED' },
  { bg: '#FFF7ED', color: '#C2410C', border: '#FDBA74', dot: '#EA580C' },
  { bg: '#ECFEFF', color: '#0E7490', border: '#67E8F9', dot: '#0891B2' },
  { bg: '#FDF2F8', color: '#BE185D', border: '#F9A8D4', dot: '#DB2777' },
];

const UNASSIGNED_STYLE = {
  background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%)',
  color: '#64748B',
  borderColor: '#CBD5E1',
};

function getUserPalette(userId, users) {
  const idx = (users || []).findIndex((u) => String(u._id) === String(userId));
  return ASSIGNEE_PALETTE[idx >= 0 ? idx % ASSIGNEE_PALETTE.length : 0];
}

function getAssigneeStyle(userId, users) {
  if (!userId) return UNASSIGNED_STYLE;
  const p = getUserPalette(userId, users);
  return {
    background: `linear-gradient(135deg, ${p.bg} 0%, #fff 100%)`,
    color: p.color,
    borderColor: p.border,
  };
}

function UserAvatar({ name, palette, size = 20 }) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  return (
    <span
      className="assign-dropdown-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size <= 20 ? 10 : 11,
        background: palette.dot,
      }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function AssignDropdown({
  users,
  value,
  onChange,
  allowUnassigned = true,
  placeholder = 'Unassigned',
  className = '',
  style = {},
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 150, maxHeight: 280 });
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selectedUser = (users || []).find((u) => String(u._id) === String(value));
  const emptyLabel = !allowUnassigned && !value ? 'Select BDA…' : placeholder;
  const label = selectedUser?.name || emptyLabel;
  const hasValue = Boolean(value);
  const triggerStyle = getAssigneeStyle(value, users);
  const selectedPalette = hasValue ? getUserPalette(value, users) : null;

  const options = [
    ...(allowUnassigned ? [{ _id: null, name: placeholder }] : []),
    ...(users || []),
  ];

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 160);
    const viewportPad = 8;
    const gap = 4;
    const menuMax = 280;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left;
    if (left + menuWidth > vw - viewportPad) left = vw - menuWidth - viewportPad;
    left = Math.max(viewportPad, left);

    const spaceBelow = vh - rect.bottom - gap - viewportPad;
    const spaceAbove = rect.top - gap - viewportPad;
    const estimatedHeight = Math.min(options.length * 40 + 12, menuMax);
    const measuredHeight = menuRef.current
      ? Math.min(menuRef.current.scrollHeight, menuMax)
      : estimatedHeight;
    const openUp = spaceBelow < measuredHeight && spaceAbove > spaceBelow;

    let top;
    let maxHeight;

    if (openUp) {
      maxHeight = Math.min(menuMax, Math.max(spaceAbove, 120));
      const menuHeight = menuRef.current
        ? Math.min(menuRef.current.offsetHeight, maxHeight)
        : Math.min(estimatedHeight, maxHeight);
      top = rect.top - gap - menuHeight;
      if (top < viewportPad) {
        top = viewportPad;
        maxHeight = rect.top - gap - viewportPad;
      }
    } else {
      top = rect.bottom + gap;
      maxHeight = Math.min(menuMax, Math.max(spaceBelow, 120));
    }

    setMenuStyle({ top, left, width: menuWidth, maxHeight });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    const menuEl = menuRef.current;
    const ro = menuEl ? new ResizeObserver(updateMenuPosition) : null;
    ro?.observe(menuEl);

    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
      ro?.disconnect();
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const inWrap = wrapRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inWrap && !inMenu) setOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const pick = (userId) => {
    onChange(userId || null);
    setOpen(false);
  };

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="assign-dropdown-menu"
          role="listbox"
          style={{
            position: 'fixed',
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            maxHeight: menuStyle.maxHeight,
            zIndex: 10000,
          }}
        >
          {options.map((user) => {
            const isUnassigned = !user._id;
            const isSelected = isUnassigned ? !value : String(value) === String(user._id);
            const palette = isUnassigned ? null : getUserPalette(user._id, users);
            const optionStyle = isUnassigned
              ? undefined
              : {
                  background: palette.bg,
                  color: palette.color,
                  borderColor: palette.border,
                };

            return (
              <button
                key={user._id || '__unassigned'}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`assign-dropdown-option${isUnassigned ? ' assign-dropdown-option--neutral' : ''}${isSelected ? ' is-selected' : ''}`}
                style={optionStyle}
                onClick={() => pick(user._id)}
              >
                {!isUnassigned && <UserAvatar name={user.name} palette={palette} />}
                <span className="assign-dropdown-option-label">{user.name}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={wrapRef}
      className={`assign-dropdown ${className}`.trim()}
      style={{ minWidth: 110, width: '100%', maxWidth: 150, ...style }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`assign-dropdown-trigger${hasValue ? ' assign-dropdown-trigger--assigned' : ' assign-dropdown-trigger--unassigned'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          background: triggerStyle.background,
          color: triggerStyle.color,
          borderColor: triggerStyle.borderColor,
        }}
      >
        {hasValue && selectedPalette && (
          <UserAvatar name={selectedUser?.name} palette={selectedPalette} />
        )}
        <span className="assign-dropdown-label">{label}</span>
        <ChevronDown />
      </button>
      {menu}
    </div>
  );
}
