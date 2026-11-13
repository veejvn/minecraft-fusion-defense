import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PhaserHost } from '../../components/game/phaser-host';

function Fixture() {
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <button id="mount" onClick={() => setMounted(true)}>Mount</button>
      <button id="unmount" onClick={() => setMounted(false)}>Unmount</button>
      {mounted && <PhaserHost />}
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><Fixture /></StrictMode>,
);
