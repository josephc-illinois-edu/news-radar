/**
 * Smart Auto-Refresh Hook
 * Pauses when tab is hidden to save API calls
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoRefreshOptions {
  /** Refresh interval in milliseconds */
  intervalMs: number;
  /** Whether auto-refresh is enabled */
  enabled?: boolean;
  /** Callback to execute on refresh */
  onRefresh: () => void;
}

interface UseAutoRefreshReturn {
  /** Whether auto-refresh is currently enabled */
  isEnabled: boolean;
  /** Toggle auto-refresh on/off */
  setEnabled: (enabled: boolean) => void;
  /** Whether refresh is paused (tab hidden) */
  isPaused: boolean;
  /** Seconds until next refresh (0 if paused/disabled) */
  secondsUntilRefresh: number;
  /** Manually trigger a refresh and reset timer */
  refreshNow: () => void;
  /** Pause auto-refresh temporarily */
  pause: () => void;
  /** Resume auto-refresh */
  resume: () => void;
}

export function useAutoRefresh({
  intervalMs,
  enabled: initialEnabled = true,
  onRefresh,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    Math.floor(intervalMs / 1000)
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const onRefreshRef = useRef(onRefresh);

  // Keep callback ref updated
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Handle tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Set initial state
    setIsPaused(document.hidden);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Reset countdown
  const resetCountdown = useCallback(() => {
    setSecondsUntilRefresh(Math.floor(intervalMs / 1000));
  }, [intervalMs]);

  // Manual refresh
  const refreshNow = useCallback(() => {
    onRefreshRef.current();
    resetCountdown();
  }, [resetCountdown]);

  // Pause/resume
  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  // Main refresh logic
  useEffect(() => {
    clearTimers();

    const shouldRun = isEnabled && !isPaused;

    if (!shouldRun) {
      if (!isEnabled) {
        setSecondsUntilRefresh(0);
      }
      return;
    }

    // Reset countdown when starting
    resetCountdown();

    // Countdown timer (every second)
    countdownRef.current = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          return Math.floor(intervalMs / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    // Refresh timer
    intervalRef.current = setInterval(() => {
      onRefreshRef.current();
    }, intervalMs);

    return clearTimers;
  }, [isEnabled, isPaused, intervalMs, clearTimers, resetCountdown]);

  return {
    isEnabled,
    setEnabled: setIsEnabled,
    isPaused,
    secondsUntilRefresh,
    refreshNow,
    pause,
    resume,
  };
}

/**
 * Format seconds into a readable string
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
