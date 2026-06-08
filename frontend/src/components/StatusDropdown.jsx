import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { LEAD_STATUSES, getStatusSelectStyle } from '../utils/constants';

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function StatusDropdown({
  value,
  onChange,
  disabled,
  includeEmpty = false,
  emptyLabel = 'All statuses',
  className = '',
  style = {},
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 130 });
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const displayValue = value === 'Won' ? 'Converted' : value;
  const label = displayValue || emptyLabel;
  const hasValue = Boolean(displayValue);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 130);
    let left = rect.left;
    const vw = window.innerWidth;
    if (left + menuWidth > vw - 8) left = vw - menuWidth - 8;
    setMenuStyle({
      top: rect.bottom + 4,
      left: Math.max(8, left),
      width: menuWidth,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

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

  const options = includeEmpty ? [null, ...LEAD_STATUSES] : LEAD_STATUSES;

  const pick = (status) => {
    onChange(status ?? '');
    setOpen(false);
  };

  const menu = open && !disabled
    ? createPortal(
        <div
          ref={menuRef}
          className="status-dropdown-menu"
          role="listbox"
          style={{
            position: 'fixed',
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            zIndex: 10000,
          }}
        >
          {options.map((status) => {
            const key = status || '__all';
            const isSelected = status ? displayValue === status : !displayValue;
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`status-dropdown-option${status ? '' : ' status-dropdown-option--neutral'}${isSelected ? ' is-selected' : ''}`}
                style={status ? getStatusSelectStyle(status) : undefined}
                onClick={() => pick(status)}
              >
                {status || emptyLabel}
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
      className={`status-dropdown ${className}`.trim()}
      style={{ minWidth: 110, width: '100%', maxWidth: includeEmpty ? 160 : 130, ...style }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={`status-dropdown-trigger app-select status-select-filled${hasValue ? '' : ' status-dropdown-trigger--neutral'}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={hasValue ? getStatusSelectStyle(displayValue) : { width: '100%' }}
      >
        <span className="status-dropdown-label">{label}</span>
        <ChevronDown />
      </button>
      {menu}
    </div>
  );
}
