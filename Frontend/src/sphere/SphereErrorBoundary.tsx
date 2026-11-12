import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class SphereErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[SphereErrorBoundary] Uncaught Three.js/WebGL error:', error, errorInfo);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="region"
          aria-label="Sphere Fallback Visualization"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Glowing CSS Orb Fallback */}
          <div
            style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #EAF0FF 0%, #E5C18B 35%, #244DA8 70%, #050817 95%)',
              boxShadow: '0 0 45px rgba(229, 193, 139, 0.35), inset 0 0 25px rgba(36, 77, 168, 0.6)',
              position: 'relative',
              animation: 'pulse-glow 3s ease-in-out infinite',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '-18px',
                borderRadius: '50%',
                border: '1.5px dashed rgba(229, 193, 139, 0.4)',
                animation: 'spin 12s linear infinite',
              }}
            />
          </div>

          <div
            style={{
              marginTop: '24px',
              color: 'var(--space-star)',
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-hud)',
              background: 'var(--space-navy-90)',
              border: '1px solid var(--space-blue-70)',
              padding: '6px 14px',
              borderRadius: '6px',
            }}
          >
            Assistant Active • 2D Stage Mode
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
