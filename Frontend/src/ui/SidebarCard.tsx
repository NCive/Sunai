import React, { useState } from 'react';
import { ChevronDownIcon } from './Icons';

export interface SidebarCardProps {
  title: string;
  icon?: React.ReactNode;
  defaultCollapsed?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  reduceMotion?: boolean;
}

export const SidebarCard: React.FC<SidebarCardProps> = ({
  title,
  icon,
  defaultCollapsed = false,
  isCollapsed: controlledCollapsed,
  onToggle,
  headerRight,
  children,
  className = '',
  style,
  reduceMotion = false,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const transitionStyle = reduceMotion ? 'none' : 'transform 0.2s ease, border-color 0.2s ease';

  return (
    <div
      className={`space-card sidebar-card ${className}`}
      style={{
        background: 'var(--space-navy-88)',
        border: '1px solid var(--space-blue-70)',
        borderRadius: '6px',
        transition: transitionStyle,
        ...style,
      }}
    >
      <div
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '40px',
          padding: '0 12px',
          cursor: 'pointer',
          userSelect: 'none',
          borderRadius: isCollapsed ? '5px' : '5px 5px 0 0',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--space-blue-40)',
          background: isCollapsed ? 'transparent' : 'var(--space-blue-20)',
          transition: 'background 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {icon && (
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--space-star)', flexShrink: 0 }}>
              {icon}
            </span>
          )}
          <span
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '0.74rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--space-star)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {headerRight && <div onClick={(e) => e.stopPropagation()}>{headerRight}</div>}
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              color: 'var(--space-star-70)',
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: reduceMotion ? 'none' : 'transform 0.2s ease',
            }}
          >
            <ChevronDownIcon size={14} />
          </span>
        </div>
      </div>

      {!isCollapsed && (
        <div style={{ padding: '12px' }}>
          {children}
        </div>
      )}
    </div>
  );
};
