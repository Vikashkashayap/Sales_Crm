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
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 130, maxHeight: 320 });
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const displayValue = value === 'Won' ? 'Converted' : value;
  const label = displayValue || emptyLabel;
  const hasValue = Boolean(displayValue);
  const options = includeEmpty ? [null, ...LEAD_STATUSES] : LEAD_STATUSES;

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = Math.max(rect.width, 130);
    const viewportPad = 8;
    const gap = 4;
    const menuMax = 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left;
    if (left + menuWidth > vw - viewportPad) left = vw - menuWidth - viewportPad;
    left = Math.max(viewportPad, left);

    const spaceBelow = vh - rect.bottom - gap - viewportPad;
    const spaceAbove = rect.top - gap - viewportPad;
    const estimatedHeight = Math.min(options.length * 42 + 12, menuMax);
    const measuredHeight = menuEl
      ? Math.min(menuEl.scrollHeight, menuMax)
      : estimatedHeight;
    const openUp = spaceBelow < measuredHeight && spaceAbove > spaceBelow;

    let top;
    let maxHeight;

    if (openUp) {
      maxHeight = Math.min(menuMax, Math.max(spaceAbove, 120));
      const menuHeight = menuEl
        ? Math.min(menuEl.offsetHeight, maxHeight)
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

    setMenuStyle({
      top,
      left,
      width: menuWidth,
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    const menuEl = menuRef.current;
    const resizeObserver = menuEl
      ? new ResizeObserver(() => updateMenuPosition())
      : null;
    resizeObserver?.observe(menuEl);

    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
      resizeObserver?.disconnect();
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
            maxHeight: menuStyle.maxHeight,
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
