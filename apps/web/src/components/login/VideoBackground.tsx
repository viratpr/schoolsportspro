'use client';

import { useState } from 'react';

export default function VideoBackground() {
  const [videoError, setVideoError] = useState(false);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* Fallback: background image when video fails or is missing */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-muted ${videoError ? '' : 'hidden'}`}
        style={videoError ? { backgroundImage: 'url(/login-bg-cricket.png)' } : undefined}
        aria-hidden
      />
      {!videoError && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/Kidsplaying.mp4"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          onError={() => setVideoError(true)}
        />
      )}
      {/* Light gradient on the left so form is readable */}
      <div
        className="absolute inset-y-0 left-0 w-full max-w-[55%] bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none"
        aria-hidden
      />
    </div>
  );
}
