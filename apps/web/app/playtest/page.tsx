import type { Metadata } from 'next';
import { PlaytestHost } from '../../components/game/playtest-host';

export const metadata: Metadata = {
  title: '1-Lane Playtest Sandbox — Minecraft Fusion Defense',
};

export default function PlaytestPage() {
  return <PlaytestHost />;
}
