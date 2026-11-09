import React, { useState } from 'react';

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

  const transitionStyle = reduceMotion ? 'none' : 'all 0.2s ease-in-out';

  return (
    <div
      className={`sidebar-card ${className}`}
      style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        transition: transitionStyle,
        ...style,
      }}
    >
      <div
        onClick={handleToggle}
        role="button"
        tabIndex={0}
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
          padding: '10px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
          background: isCollapsed ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <span style={{ fontSize: '0.95rem', display: 'flex' }}>{icon}</span>}
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#e2e8f0',
            }}
          >
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {headerRight && <div onClick={(e) => e.stopPropagation()}>{headerRight}</div>}
          <span
            style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: reduceMotion ? 'none' : 'transform 0.2s ease',
              display: 'inline-block',
            }}
            title={isCollapsed ? 'Expand card' : 'Collapse card'}
          >
            ▼
          </span>
        </div>
      </div>

      {!isCollapsed && (
        <div
          style={{
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

