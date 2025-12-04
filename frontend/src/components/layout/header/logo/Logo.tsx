import { Link } from 'react-router-dom';
import VaraLogo from '@/assets/images/logo.svg?react';

function Logo() {
  return (
    <Link
      to="/"
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 8,
      }}
    >
      <span
        style={{
          width: 'clamp(26px, 3.2vw, 36px)',
          height: 'clamp(26px, 3.2vw, 36px)',
          borderRadius: 999,
          background: '#00f5af',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 4px rgba(34,197,94,0.18)',
        }}
      >
        <VaraLogo
          style={{
            height: 'clamp(18px, 2.4vw, 24px)',
            width: 'auto',
            display: 'block',
          }}
        />
      </span>
    </Link>
  );
}

export { Logo };
