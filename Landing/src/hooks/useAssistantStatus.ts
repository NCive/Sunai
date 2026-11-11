import { useState, useEffect, useCallback } from 'react';
import { content } from '../content';

export function useAssistantStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const checkStatus = useCallback(async () => {
    if (!content.assistantStatus.enabled) {
      setIsOnline(true);
      return;
    }

    setIsChecking(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), content.assistantStatus.timeoutMs);

    try {
      // mode: 'no-cors' allows detecting if the local web server is up and accepting connections
      await fetch(content.assistantUrl, {
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      clearTimeout(timer);
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!content.assistantStatus.enabled) {
      setIsOnline(true);
      return;
    }

    // Initial check slightly deferred after initial paint
    let intervalId: number | undefined;
    const initialTimer = setTimeout(() => {
      checkStatus();
      if (!document.hidden) {
        startPolling();
      }
    }, 600);

    const startPolling = () => {
      if (!intervalId) {
        intervalId = window.setInterval(checkStatus, content.assistantStatus.pollIntervalMs);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        checkStatus();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkStatus]);

  return { isOnline, isChecking, refreshStatus: checkStatus };
}

