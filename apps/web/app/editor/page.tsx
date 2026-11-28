import type { Metadata } from 'next';
import { LevelEditorHost } from '../../components/editor/level-editor-host';

export const metadata: Metadata = {
  title: 'Dev Stage Studio (/editor) — Minecraft Fusion Defense',
};

export default function EditorPage() {
  return <LevelEditorHost />;
}
