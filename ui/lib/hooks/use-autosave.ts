import { useEffect, useRef, useState } from "react";

type AutosaveOptions = {
  key: string;
  interval?: number; // milliseconds, default 30000 (30s)
  onSave?: (data: string) => void;
};

export function useAutosave(value: string, options: AutosaveOptions) {
  const { key, interval = 30000, onSave } = options;
  const [lastSaved, setLastSaved] = useState<Date | null>(() => {
    // Initialize lastSaved from localStorage
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.timestamp) {
          return new Date(data.timestamp);
        }
      } catch {
        // Ignore parse errors
      }
    }
    return null;
  });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save on interval
  useEffect(() => {
    if (!value) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      const now = new Date();
      const data = {
        value,
        timestamp: now.toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(data));
      setLastSaved(now);
      onSave?.(value);
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, key, interval, onSave]);

  const clearSaved = () => {
    localStorage.removeItem(key);
    setLastSaved(null);
  };

  const getSaved = (): string | null => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return data.value || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  return { lastSaved, clearSaved, getSaved };
}

export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);
}

export function formatTimeSince(date: Date | null): string {
  if (!date) return "Never";

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString();
}
