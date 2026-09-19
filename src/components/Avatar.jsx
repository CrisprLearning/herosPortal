import React, { useEffect, useState } from 'react';
import { getInitials } from '../lib/format';

// Photo with an initials fallback when there is no image or it fails to load.
export default function Avatar({ src, name, size = 40, className = '', radius = '50%' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  const style = { width: size, height: size, borderRadius: radius, fontSize: Math.max(11, size * 0.38) };
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || ''}
        className={`pp-avatar ${className}`}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className={`pp-avatar pp-avatar-fallback ${className}`} style={style} aria-label={name}>
      {getInitials(name || '')}
    </span>
  );
}
