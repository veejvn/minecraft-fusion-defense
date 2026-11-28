'use client';

import { useEffect, useState } from 'react';

type OrientationApi = {
  lock?: (orientation: 'landscape' | 'landscape-primary' | 'any') => Promise<void>;
  unlock?: () => void;
};

type DocumentWithWebkitFullscreen = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type ElementWithWebkitFullscreen = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as DocumentWithWebkitFullscreen;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/**
 * Request browser fullscreen and lock screen orientation to landscape on supported mobile browsers
 * (e.g. Android Chrome/Edge). Safe no-op with typed status on iOS Safari / desktop.
 */
export async function requestLandscapeFullscreen(): Promise<'locked' | 'fullscreen-only' | 'unsupported'> {
  if (typeof document === 'undefined') return 'unsupported';
  const root = document.documentElement as ElementWithWebkitFullscreen;
  let enteredFullscreen = Boolean(getFullscreenElement());

  try {
    if (!enteredFullscreen) {
      if (typeof root.requestFullscreen === 'function') {
        await root.requestFullscreen();
        enteredFullscreen = true;
      } else if (typeof root.webkitRequestFullscreen === 'function') {
        await root.webkitRequestFullscreen();
        enteredFullscreen = true;
      }
    }
  } catch {
    // Fullscreen may be rejected if gesture/policy restricts it; still attempt orientation.lock below.
  }

  try {
    const orientation = (typeof screen !== 'undefined' ? screen.orientation : undefined) as
      | OrientationApi
      | undefined;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('landscape');
      return 'locked';
    }
  } catch {
    // iOS Safari and many desktop browsers do not permit programmatic screen.orientation.lock.
  }

  return enteredFullscreen ? 'fullscreen-only' : 'unsupported';
}

/** Toggle fullscreen + landscape lock on/off cleanly without throwing. */
export async function toggleLandscapeFullscreen(): Promise<
  'locked' | 'fullscreen-only' | 'exited' | 'unsupported'
> {
  if (typeof document === 'undefined') return 'unsupported';
  const doc = document as DocumentWithWebkitFullscreen;

  if (getFullscreenElement()) {
    try {
      const orientation = (typeof screen !== 'undefined' ? screen.orientation : undefined) as
        | OrientationApi
        | undefined;
      orientation?.unlock?.();
    } catch {
      // Ignore unlock errors.
    }
    try {
      if (typeof doc.exitFullscreen === 'function') {
        await doc.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === 'function') {
        await doc.webkitExitFullscreen();
      }
    } catch {
      // Ignore exit fullscreen errors.
    }
    return 'exited';
  }

  return requestLandscapeFullscreen();
}

function isNarrowPortraitViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < window.innerHeight && window.innerWidth <= 900;
}

export function MobileLandscapeGuard() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [lockHint, setLockHint] = useState<string | null>(null);

  useEffect(() => {
    const syncOrientation = () => {
      const portraitNow = isNarrowPortraitViewport();
      setIsPortrait(portraitNow);
      if (!portraitNow) {
        setDismissed(false);
        setLockHint(null);
      }
    };

    syncOrientation();
    window.addEventListener('resize', syncOrientation);
    window.addEventListener('orientationchange', syncOrientation);
    return () => {
      window.removeEventListener('resize', syncOrientation);
      window.removeEventListener('orientationchange', syncOrientation);
    };
  }, []);

  if (!isPortrait || dismissed) {
    return null;
  }

  const handleRotateAndFullscreen = async () => {
    const result = await requestLandscapeFullscreen();
    if (result === 'unsupported' || result === 'fullscreen-only') {
      setLockHint(
        'Trình duyệt trên máy này không hỗ trợ tự khóa xoay ngang (nhất là iOS/Safari). Hãy tắt Khóa hướng dọc ở Control Center rồi xoay ngang điện thoại.',
      );
    } else {
      setLockHint(null);
    }
  };

  return (
    <div
      className="mfd-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Rotate Device to Landscape"
      style={{ zIndex: 90, backdropFilter: 'blur(4px)' }}
    >
      <div
        className="mfd-modal"
        style={{
          maxWidth: 380,
          textAlign: 'center',
          borderColor: '#4ade80',
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 68,
            height: 68,
            borderRadius: 16,
            background: 'rgba(20, 83, 45, 0.35)',
            border: '2px solid #4ade80',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={40}
            height={40}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mfd-rotate-phone-icon"
          >
            <rect x="7" y="3" width="10" height="18" rx="2" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, color: '#FACC15' }}>
            Xoay ngang màn hình để chơi
          </h2>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#CBD5E1' }}>
            Bàn cờ 5×10 được thiết kế tối ưu cho màn hình ngang (Landscape). Bấm nút bên dưới để mở toàn màn hình và xoay ngang tự động trên Android/Chrome.
          </p>
        </div>

        {lockHint && (
          <div
            role="status"
            style={{
              fontSize: 11,
              lineHeight: 1.45,
              color: '#FDE68A',
              background: 'rgba(133, 77, 14, 0.28)',
              border: '1px solid #ca8a04',
              borderRadius: 8,
              padding: '8px 10px',
            }}
          >
            {lockHint}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <button
            type="button"
            className="mfd-btn mfd-btn-primary"
            style={{ width: '100%', padding: '10px 14px', fontSize: 13 }}
            onClick={() => void handleRotateAndFullscreen()}
          >
            ↻ Xoay ngang &amp; Toàn màn hình
          </button>
          <button
            type="button"
            className="mfd-btn"
            style={{ width: '100%', padding: '8px 14px', fontSize: 12 }}
            onClick={() => setDismissed(true)}
          >
            Tiếp tục ở màn hình dọc
          </button>
        </div>
      </div>
    </div>
  );
}
