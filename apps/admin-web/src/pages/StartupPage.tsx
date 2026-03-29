import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useSessionStatus } from '@/queries/auth';

export function StartupPage() {
  const navigate = useNavigate();
  const sessionQuery = useSessionStatus();
  const [hovered, setHovered] = useState(false);
  const startupIconPath = '/prototype/brand-mark.png';

  const handleProceed = () => {
    const nextPath = sessionQuery.data?.session?.authenticated ? '/dashboard' : '/login';
    void navigate({ to: nextPath });
  };

  return (
    <section
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
        userSelect: 'none',
        background:
          'radial-gradient(circle at top left, rgba(188, 240, 174, 0.26), transparent 30%), radial-gradient(circle at bottom right, rgba(21, 66, 18, 0.1), transparent 26%), linear-gradient(180deg, #f8fbf7 0%, #eef4ef 100%)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-140px',
          right: '-96px',
          width: '320px',
          height: '320px',
          borderRadius: '999px',
          background: 'radial-gradient(circle, rgba(21, 66, 18, 0.18) 0%, rgba(21, 66, 18, 0) 72%)',
          filter: 'blur(12px)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-72px',
          width: '280px',
          height: '280px',
          borderRadius: '999px',
          background: 'radial-gradient(circle, rgba(188, 240, 174, 0.28) 0%, rgba(188, 240, 174, 0) 70%)',
          filter: 'blur(8px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          width: 'min(640px, 100%)',
          padding: '40px 32px 36px',
          borderRadius: '28px',
          border: '1px solid rgba(21, 66, 18, 0.1)',
          background: 'rgba(255, 255, 255, 0.88)',
          boxShadow: '0 28px 60px -26px rgba(25, 28, 29, 0.22)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            borderRadius: '999px',
            background: 'rgba(21, 66, 18, 0.08)',
            color: '#154212',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.68rem',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Desktop Workspace
        </span>
        <img
          src={startupIconPath}
          alt="Bakki Manager icon"
          style={{
            width: 'min(220px, calc(100vw - 168px))',
            height: 'auto',
            display: 'block',
            borderRadius: '28px',
            boxShadow: '0 18px 32px -24px rgba(21, 66, 18, 0.48)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              margin: 0,
              color: '#003929',
              fontSize: 'clamp(1.8rem, 3vw, 2.3rem)',
              fontWeight: 800,
              fontFamily: "'Manrope', sans-serif",
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            Bakki Manager
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: '30rem',
              color: '#3f4944',
              fontSize: '0.98rem',
              lineHeight: 1.55,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Enter the desktop workspace for ranch planning, geometry management, and live Bakki operations.
          </p>
        </div>
        <button
          disabled={sessionQuery.isPending}
          onBlur={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={handleProceed}
          style={{
            marginTop: '8px',
            background: hovered && !sessionQuery.isPending ? '#0f3510' : '#154212',
            color: '#ffffff',
            border: 0,
            borderRadius: '14px',
            padding: '14px 40px',
            fontWeight: 700,
            fontFamily: "'Epilogue', sans-serif",
            fontSize: '0.92rem',
            letterSpacing: '0.02em',
            cursor: sessionQuery.isPending ? 'wait' : 'pointer',
            transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
            boxShadow:
              hovered && !sessionQuery.isPending
                ? '0 14px 30px -18px rgba(21, 66, 18, 0.45)'
                : '0 10px 20px -16px rgba(21, 66, 18, 0.4)',
            transform: hovered && !sessionQuery.isPending ? 'translateY(-1px)' : 'translateY(0)',
            minWidth: '196px',
            opacity: sessionQuery.isPending ? 0.85 : 1,
          }}
          type="button"
        >
          {sessionQuery.isPending ? 'Checking Session...' : 'Open App'}
        </button>
      </div>
    </section>
  );
}
