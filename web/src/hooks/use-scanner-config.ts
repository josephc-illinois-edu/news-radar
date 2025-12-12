/**
 * Scanner Configuration Hook
 * Manages scan parameters with localStorage persistence
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ScanConfig, ScanPreset } from '@/types/scanner';
import { DEFAULT_SCAN_CONFIG, BUILT_IN_PRESETS } from '@/types/scanner';

const STORAGE_KEY = 'scanner-config';
const PRESETS_KEY = 'scanner-presets';
const COLLAPSED_KEY = 'scanner-controls-collapsed';

/**
 * Hook to manage scan configuration with localStorage persistence
 */
export function useScannerConfig() {
  const [config, setConfigState] = useState<ScanConfig>(DEFAULT_SCAN_CONFIG);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ScanConfig;
        setConfigState(parsed);
      }
    } catch (e) {
      console.error('Failed to load scanner config:', e);
    }
    setIsHydrated(true);
  }, []);

  // Persist config changes to localStorage
  const setConfig = useCallback((newConfig: ScanConfig | ((prev: ScanConfig) => ScanConfig)) => {
    setConfigState(prev => {
      const updated = typeof newConfig === 'function' ? newConfig(prev) : newConfig;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save scanner config:', e);
      }
      return updated;
    });
  }, []);

  // Update individual config fields
  const updateConfig = useCallback(<K extends keyof ScanConfig>(key: K, value: ScanConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, [setConfig]);

  // Reset to defaults
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_SCAN_CONFIG);
  }, [setConfig]);

  // Toggle source selection
  const toggleSource = useCallback((slug: string) => {
    setConfig(prev => ({
      ...prev,
      sources: prev.sources.includes(slug)
        ? prev.sources.filter(s => s !== slug)
        : [...prev.sources, slug],
    }));
  }, [setConfig]);

  // Add keyword filter
  const addKeyword = useCallback((keyword: string) => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return;
    setConfig(prev => ({
      ...prev,
      keywords: prev.keywords.includes(normalized)
        ? prev.keywords
        : [...prev.keywords, normalized],
    }));
  }, [setConfig]);

  // Remove keyword filter
  const removeKeyword = useCallback((keyword: string) => {
    setConfig(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword),
    }));
  }, [setConfig]);

  return {
    config,
    setConfig,
    updateConfig,
    resetConfig,
    toggleSource,
    addKeyword,
    removeKeyword,
    isHydrated,
  };
}

/**
 * Hook to manage scan presets (localStorage + future Supabase sync)
 */
export function useScannerPresets() {
  const [presets, setPresetsState] = useState<ScanPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PRESETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ScanPreset[];
        setPresetsState(parsed);
      }
    } catch (e) {
      console.error('Failed to load scanner presets:', e);
    }
    setIsHydrated(true);
  }, []);

  // Persist presets to localStorage
  const persistPresets = useCallback((newPresets: ScanPreset[]) => {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets));
    } catch (e) {
      console.error('Failed to save scanner presets:', e);
    }
  }, []);

  // Get all presets (built-in + user)
  const allPresets = [...BUILT_IN_PRESETS.map((p, i) => ({
    ...p,
    id: `builtin-${i}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })), ...presets];

  // Save a new preset
  const savePreset = useCallback((name: string, config: ScanConfig) => {
    const newPreset: ScanPreset = {
      id: `user-${Date.now()}`,
      name,
      config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...presets, newPreset];
    setPresetsState(updated);
    persistPresets(updated);
    return newPreset;
  }, [presets, persistPresets]);

  // Update an existing preset
  const updatePreset = useCallback((id: string, updates: Partial<Omit<ScanPreset, 'id' | 'createdAt'>>) => {
    const updated = presets.map(p =>
      p.id === id
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    );
    setPresetsState(updated);
    persistPresets(updated);
  }, [presets, persistPresets]);

  // Delete a preset
  const deletePreset = useCallback((id: string) => {
    // Can't delete built-in presets
    if (id.startsWith('builtin-')) return;
    const updated = presets.filter(p => p.id !== id);
    setPresetsState(updated);
    persistPresets(updated);
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  }, [presets, activePresetId, persistPresets]);

  // Apply a preset to current config
  const applyPreset = useCallback((preset: ScanPreset): ScanConfig => {
    setActivePresetId(preset.id);
    return preset.config;
  }, []);

  return {
    presets: allPresets,
    userPresets: presets,
    activePresetId,
    setActivePresetId,
    savePreset,
    updatePreset,
    deletePreset,
    applyPreset,
    isHydrated,
  };
}

/**
 * Hook to manage controls panel collapse state
 */
export function useControlsCollapsed() {
  const [isCollapsed, setIsCollapsedState] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored) {
        setIsCollapsedState(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load collapse state:', e);
    }
    setIsHydrated(true);
  }, []);

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed);
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
    } catch (e) {
      console.error('Failed to save collapse state:', e);
    }
  }, []);

  return {
    isCollapsed,
    setIsCollapsed,
    isHydrated,
  };
}
