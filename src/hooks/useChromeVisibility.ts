import { useCallback, useEffect, useRef, useState } from 'react';

interface UseChromeVisibilityOptions {
  ready: boolean;
  panelsOpen: boolean[];
}

export function useChromeVisibility({ ready, panelsOpen }: UseChromeVisibilityOptions) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anyPanelOpen = panelsOpen.some(Boolean);

  const scheduleHide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, 6000); // 6s gives users enough time to find and tap a button
  }, []);

  useEffect(() => {
    if (visible && ready && !anyPanelOpen) {
      scheduleHide();
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visible, ready, anyPanelOpen, scheduleHide]);

  const toggle = useCallback(() => {
    setVisible((prev) => !prev);
  }, []);

  const show = useCallback(() => {
    setVisible(true);
  }, []);

  return { visible, toggle, show };
}
