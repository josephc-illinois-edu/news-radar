'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  SynthesizeRequest,
  SynthesizeResponse,
  SynthesisResult,
  ResearchContext,
  SuggestedAngle,
  GenerateFromSynthesisRequest,
  GenerateFromSynthesisResponse,
  SynthesizedArticle,
} from '@/types/synthesis';

// === Query Keys ===

export const synthesisKeys = {
  all: ['synthesis'] as const,
  result: (contextId: string) => [...synthesisKeys.all, 'result', contextId] as const,
  angles: (contextId: string) => [...synthesisKeys.all, 'angles', contextId] as const,
};

// === Synthesis API ===

async function synthesizeResearch(
  request: SynthesizeRequest
): Promise<SynthesisResult> {
  const response = await fetch('/api/create/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Synthesis failed');
  }

  const { success, data, error } = await response.json() as SynthesizeResponse;

  if (!success || !data) {
    throw new Error(error || 'Synthesis failed');
  }

  return data;
}

export function useSynthesizeResearch() {
  return useMutation({
    mutationFn: synthesizeResearch,
  });
}

// === Generate from Synthesis ===

async function generateFromSynthesis(
  request: GenerateFromSynthesisRequest
): Promise<SynthesizedArticle> {
  const response = await fetch('/api/create/generate-synthesis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Generation failed');
  }

  const { success, data, error } = await response.json() as GenerateFromSynthesisResponse;

  if (!success || !data) {
    throw new Error(error || 'Generation failed');
  }

  return data;
}

export function useGenerateFromSynthesis() {
  return useMutation({
    mutationFn: generateFromSynthesis,
  });
}

// === Research Context Management ===

const RESEARCH_CONTEXT_KEY = 'create-research-context';

export interface StoredResearchContext {
  context: ResearchContext;
  synthesis?: SynthesisResult;
  selectedAngle?: SuggestedAngle;
  createdAt: string;
}

export function useResearchContext() {
  const queryClient = useQueryClient();

  // Load context from sessionStorage
  const query = useQuery({
    queryKey: ['research-context'],
    queryFn: (): StoredResearchContext | null => {
      if (typeof window === 'undefined') return null;
      const stored = sessionStorage.getItem(RESEARCH_CONTEXT_KEY);
      return stored ? JSON.parse(stored) : null;
    },
    staleTime: Infinity, // Context doesn't go stale
  });

  // Save context
  const saveContext = useMutation({
    mutationFn: async (data: Omit<StoredResearchContext, 'createdAt'>): Promise<StoredResearchContext> => {
      const context: StoredResearchContext = {
        ...data,
        createdAt: new Date().toISOString(),
      };
      sessionStorage.setItem(RESEARCH_CONTEXT_KEY, JSON.stringify(context));
      return context;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-context'] });
    },
  });

  // Update synthesis result
  const updateSynthesis = useMutation({
    mutationFn: async (synthesis: SynthesisResult): Promise<StoredResearchContext | null> => {
      const current = query.data;
      if (!current) return null;

      const updated: StoredResearchContext = {
        ...current,
        synthesis,
      };
      sessionStorage.setItem(RESEARCH_CONTEXT_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-context'] });
    },
  });

  // Select an angle
  const selectAngle = useMutation({
    mutationFn: async (angle: SuggestedAngle): Promise<StoredResearchContext | null> => {
      const current = query.data;
      if (!current) return null;

      const updated: StoredResearchContext = {
        ...current,
        selectedAngle: angle,
      };
      sessionStorage.setItem(RESEARCH_CONTEXT_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-context'] });
    },
  });

  // Clear context
  const clearContext = () => {
    sessionStorage.removeItem(RESEARCH_CONTEXT_KEY);
    queryClient.invalidateQueries({ queryKey: ['research-context'] });
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    saveContext,
    updateSynthesis,
    selectAngle,
    clearContext,
    hasContext: !!query.data,
    hasSynthesis: !!query.data?.synthesis,
    hasSelectedAngle: !!query.data?.selectedAngle,
  };
}

// === Angle Selection Helpers ===

export function useAngleSelection(angles: SuggestedAngle[] = []) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['selected-angle'],
    queryFn: (): SuggestedAngle | null => {
      if (typeof window === 'undefined') return null;
      const stored = sessionStorage.getItem('selected-angle');
      return stored ? JSON.parse(stored) : null;
    },
    staleTime: Infinity,
  });

  const selectAngle = useMutation({
    mutationFn: async (angle: SuggestedAngle): Promise<SuggestedAngle> => {
      sessionStorage.setItem('selected-angle', JSON.stringify(angle));
      return angle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selected-angle'] });
    },
  });

  const clearAngle = () => {
    sessionStorage.removeItem('selected-angle');
    queryClient.invalidateQueries({ queryKey: ['selected-angle'] });
  };

  return {
    selectedAngle: query.data,
    isLoading: query.isLoading,
    selectAngle,
    clearAngle,
    isSelected: (angleId: string) => query.data?.id === angleId,
  };
}

// === Utility Functions ===

export function getAnglesByRisk(
  angles: SuggestedAngle[],
  risk: SuggestedAngle['riskLevel']
): SuggestedAngle[] {
  return angles.filter(a => a.riskLevel === risk);
}

export function sortAnglesByOriginality(angles: SuggestedAngle[]): SuggestedAngle[] {
  return [...angles].sort((a, b) => b.originalityScore - a.originalityScore);
}

export function getRecommendedAngle(angles: SuggestedAngle[]): SuggestedAngle | null {
  // Prefer moderate risk with high originality
  const moderateAngles = getAnglesByRisk(angles, 'moderate');
  if (moderateAngles.length > 0) {
    return sortAnglesByOriginality(moderateAngles)[0];
  }

  // Fallback to highest originality
  const sorted = sortAnglesByOriginality(angles);
  return sorted[0] || null;
}
