import { Link } from 'react-router-dom';

import VibeLogo from '@/assets/images/socials/vibe.png';

function Logo() {
  return (
    <Link
      to="/"
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <img 
        src={VibeLogo} 
        alt="VibePost" 
        style={{
          height: 80,
          width: 'auto',
          display: 'block',
        }} 
      />
    </Link>
  );
}

export default Logo;
