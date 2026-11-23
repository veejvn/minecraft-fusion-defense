import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Minecraft Fusion Defense',
  description: '2D Pixel-Art Fusion Tower Defense MVP (Grassland 5x9 Campaign)',
};

export const runtime = 'nodejs';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
