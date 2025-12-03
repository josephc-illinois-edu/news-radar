'use client';

import { useMutation } from '@tanstack/react-query';
import type { ScanOptions, ScanResult } from '@/types/research';

async function scanSources(options: ScanOptions): Promise<ScanResult> {
  const response = await fetch('/api/research/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Scan failed');
  }

  return response.json();
}

export function useScanSources() {
  return useMutation({
    mutationFn: scanSources,
  });
}
