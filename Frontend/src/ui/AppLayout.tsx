import React, { useState, useEffect } from 'react';
import { CONFIG } from '../config';

export interface AppLayoutProps {
  headerLeft: React.ReactNode;
  headerRight: React.ReactNode;
  stage: React.ReactNode;
  captions?: React.ReactNode;
  decisionBadge?: React.ReactNode;
  timeline?: React.ReactNode;
  sidebar: React.ReactNode;
  isTimelineCollapsed: boolean;
  background?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  headerLeft,
  headerRight,
  stage,
  captions,
  decisionBadge,
  timeline,
  sidebar,
  isTimelineCollapsed,
  background,
}) => {
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const [windowHeight, setWindowHeight] = useState<number>(window.innerHeight);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Monitor window resize for responsive layout changes
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileWidth = windowWidth < CONFIG.layout.breakpointMobileWidthPx;
  const isAutoCollapseHeight = windowHeight < CONFIG.layout.breakpointAutoCollapseHeightPx;

  // Effective timeline collapsed state (either user collapsed, or auto-collapsed on short screens)
  const effectiveTimelineCollapsed = isTimelineCollapsed || isAutoCollapseHeight;

  const timelineHeight = effectiveTimelineCollapsed
    ? CONFIG.layout.timelineCollapsedHeightPx
    : CONFIG.layout.timelineHeightPx;

  return (
    <div
      className="sunai-layout-root"
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        display: 'grid',
        gridTemplateRows: `${CONFIG.layout.headerHeightPx}px 1fr ${timelineHeight}px`,
        gridTemplateColumns: isMobileWidth
          ? '1fr'
          : `1fr clamp(${CONFIG.layout.sidebarMinWidthPx}px, 24vw, ${CONFIG.layout.sidebarMaxWidthPx}px)`,
        gridTemplateAreas: isMobileWidth
          ? `
            "header"
            "stage"
            "timeline"
          `
          : `
            "header   header"
            "stage    sidebar"
            "timeline sidebar"
          `,
        background: 'radial-gradient(circle at 50% 45%, #0d1222 0%, #060811 55%, #020306 100%)',
        color: '#e2e8f0',
      }}
    >
      {/* Background visual layers (particles, etc.) */}
      {background && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {background}
        </div>
      )}

      {/* HEADER (Full Width or Top Bar) */}
      <header
        className="sunai-header"
        style={{
          gridArea: 'header',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(6, 8, 17, 0.85)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          zIndex: 30,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isMobileWidth && (
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Toggle panels sidebar"
            >
              ☰ Controls
            </button>
          )}
          {headerLeft}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {headerRight}
        </div>
      </header>

      {/* SPHERE STAGE (Center-Left, Takes Remaining Space) */}
      <main
        className="sunai-stage-container"
        style={{
          gridArea: 'stage',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Three.js Canvas fills stage only */}
        <div
          className="stage-canvas-wrapper"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
          }}
        >
          {stage}
        </div>

        {/* Decision Pop-in Badge (Pops in at top of stage without covering sphere center) */}
        {decisionBadge && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 15,
              pointerEvents: 'none',
            }}
          >
            {decisionBadge}
          </div>
        )}

        {/* Live Captions Overlay (Sits at the bottom of the stage, leaving sphere center completely clear) */}
        {captions && (
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(760px, calc(100% - 32px))',
              maxHeight: 'min(140px, 30vh)',
              overflowY: 'auto',
              zIndex: 15,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {captions}
          </div>
        )}
      </main>

      {/* BOTTOM TIMELINE BAR (Taskbar style, Spans Stage Width) */}
      <div
        className="sunai-timeline-bar"
        style={{
          gridArea: 'timeline',
          position: 'relative',
          width: '100%',
          height: `${timelineHeight}px`,
          overflow: 'hidden',
          zIndex: 20,
        }}
      >
        {timeline}
      </div>

      {/* RIGHT SIDEBAR (Desktop: Grid Area. Mobile: Slide-in Drawer) */}
      {!isMobileWidth ? (
        <div
          className="sunai-sidebar-container"
          style={{
            gridArea: 'sidebar',
            height: '100%',
            overflow: 'hidden',
            zIndex: 20,
          }}
        >
          {sidebar}
        </div>
      ) : (
        <>
          {/* Mobile Backdrop */}
          {isDrawerOpen && (
            <div
              onClick={() => setIsDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                zIndex: 80,
              }}
            />
          )}

          {/* Mobile Drawer */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(85vw, 400px)',
              zIndex: 90,
              transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isDrawerOpen ? '-8px 0 32px rgba(0, 0, 0, 0.7)' : 'none',
            }}
          >
            <div
              style={{
                height: `${CONFIG.layout.headerHeightPx}px`,
                background: 'rgba(6, 8, 17, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0', letterSpacing: '0.04em' }}>
                CONTROLS & PANELS
              </span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ height: `calc(100% - ${CONFIG.layout.headerHeightPx}px)`, overflow: 'hidden' }}>
              {sidebar}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
