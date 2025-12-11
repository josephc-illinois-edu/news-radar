'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TrendingTopic } from '@/types/scanner';
import type { StoryResult } from '@/types/research';
import type { SuggestedAngle } from '@/types/synthesis';
import type {
  TopicIntelligence,
  TopicWorkspaceState,
  TopicNote,
  AnalyzeTopicRequest,
  AnalyzeTopicResponse,
  AnalyzeTopicOptions,
} from '@/types/topics';

// === Query Keys ===

export const topicKeys = {
  all: ['topics'] as const,
  detail: (slug: string) => [...topicKeys.all, 'detail', slug] as const,
  intelligence: (id: string) => [...topicKeys.all, 'intelligence', id] as const,
  notes: (topicId: string) => [...topicKeys.all, 'notes', topicId] as const,
};

// === Storage Keys ===

const TOPIC_WORKSPACE_KEY = 'topic-workspace';
const TOPIC_NOTES_KEY = 'topic-notes';
const TOPIC_SELECTED_ANGLE_KEY = 'topic-selected-angle';

// === Topic Analysis ===

/**
 * Hook for analyzing a topic with AI
 */
export function useTopicAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: AnalyzeTopicRequest): Promise<TopicIntelligence> => {
      const response = await fetch('/api/topics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Topic analysis failed');
      }

      const data: AnalyzeTopicResponse = await response.json();
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Analysis returned no data');
      }

      return data.data;
    },
    onSuccess: (data) => {
      // Cache the intelligence result
      queryClient.setQueryData(topicKeys.intelligence(data.topic.id), data);
    },
  });
}

/**
 * Hook to fetch cached topic intelligence
 */
export function useTopicIntelligence(topicId: string | undefined) {
  return useQuery({
    queryKey: topicKeys.intelligence(topicId || ''),
    queryFn: async (): Promise<TopicIntelligence | null> => {
      // First check localStorage
      const stored = getStoredIntelligence(topicId || '');
      if (stored) return stored;
      return null;
    },
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// === Topic Workspace State ===

/**
 * Main hook for managing the Topic Workspace UI state
 */
export function useTopicWorkspace() {
  const [state, setState] = useState<TopicWorkspaceState>({
    topic: null,
    stories: [],
    intelligence: null,
    isAnalyzing: false,
    analysisProgress: null,
    selectedAngle: null,
    notes: [],
    error: null,
  });

  const analysisMutation = useTopicAnalysis();

  // Load stored state on mount
  useEffect(() => {
    const stored = loadWorkspaceState();
    if (stored) {
      setState(prev => ({
        ...prev,
        topic: stored.topic,
        stories: stored.stories,
        intelligence: stored.intelligence,
        selectedAngle: stored.selectedAngle,
        notes: stored.notes,
      }));
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    if (state.topic) {
      saveWorkspaceState(state);
    }
  }, [state]);

  const setTopic = useCallback((topic: TrendingTopic, stories: StoryResult[]) => {
    setState(prev => ({
      ...prev,
      topic,
      stories,
      error: null,
    }));
  }, []);

  const analyze = useCallback(async (options?: AnalyzeTopicOptions) => {
    if (!state.topic || state.stories.length === 0) {
      setState(prev => ({ ...prev, error: 'No topic or stories to analyze' }));
      return;
    }

    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      analysisProgress: {
        phase: 'hypothesis',
        progress: 0,
        currentStep: 'Starting analysis...',
      },
      error: null,
    }));

    // Simulate progress updates (real progress would come from streaming)
    const progressSteps = [
      { phase: 'hypothesis' as const, progress: 25, currentStep: 'Generating hypothesis...' },
      { phase: 'analysis' as const, progress: 50, currentStep: 'Analyzing patterns...' },
      { phase: 'analysis' as const, progress: 75, currentStep: 'Identifying stakeholders...' },
      { phase: 'synthesis' as const, progress: 90, currentStep: 'Generating content angles...' },
    ];

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        setState(prev => ({
          ...prev,
          analysisProgress: progressSteps[stepIndex],
        }));
        stepIndex++;
      }
    }, 1500);

    try {
      const result = await analysisMutation.mutateAsync({
        topic: state.topic,
        stories: state.stories,
        options,
      });

      clearInterval(progressInterval);

      setState(prev => ({
        ...prev,
        intelligence: result,
        isAnalyzing: false,
        analysisProgress: {
          phase: 'complete',
          progress: 100,
          currentStep: 'Analysis complete',
        },
      }));

      // Store for persistence
      storeIntelligence(state.topic.id, result);

      return result;
    } catch (error) {
      clearInterval(progressInterval);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        analysisProgress: null,
        error: error instanceof Error ? error.message : 'Analysis failed',
      }));
    }
  }, [state.topic, state.stories, analysisMutation]);

  const selectAngle = useCallback((angle: SuggestedAngle | null) => {
    setState(prev => ({ ...prev, selectedAngle: angle }));
    if (state.topic && angle) {
      localStorage.setItem(
        `${TOPIC_SELECTED_ANGLE_KEY}-${state.topic.id}`,
        JSON.stringify(angle)
      );
    }
  }, [state.topic]);

  const addNote = useCallback((content: string, category: TopicNote['category'] = 'general') => {
    if (!state.topic) return;

    const note: TopicNote = {
      id: `note-${Date.now()}`,
      topicId: state.topic.id,
      content,
      category,
      createdAt: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      notes: [...prev.notes, note],
    }));

    // Persist notes
    const stored = getNotes(state.topic.id);
    localStorage.setItem(
      `${TOPIC_NOTES_KEY}-${state.topic.id}`,
      JSON.stringify([...stored, note])
    );
  }, [state.topic]);

  const removeNote = useCallback((noteId: string) => {
    setState(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== noteId),
    }));

    if (state.topic) {
      const stored = getNotes(state.topic.id);
      localStorage.setItem(
        `${TOPIC_NOTES_KEY}-${state.topic.id}`,
        JSON.stringify(stored.filter(n => n.id !== noteId))
      );
    }
  }, [state.topic]);

  const reset = useCallback(() => {
    setState({
      topic: null,
      stories: [],
      intelligence: null,
      isAnalyzing: false,
      analysisProgress: null,
      selectedAngle: null,
      notes: [],
      error: null,
    });
    clearWorkspaceState();
  }, []);

  return {
    ...state,
    setTopic,
    analyze,
    selectAngle,
    addNote,
    removeNote,
    reset,
    isReady: !!state.topic && state.stories.length > 0,
    hasAnalysis: !!state.intelligence,
  };
}

// === Topic Navigation ===

/**
 * Hook for navigating to topic workspace
 */
export function useTopicNavigation() {
  const prepareTopicWorkspace = useCallback((
    topic: TrendingTopic,
    stories: StoryResult[]
  ) => {
    // Store in sessionStorage for page navigation
    sessionStorage.setItem('pending-topic-analysis', JSON.stringify({ topic, stories }));
  }, []);

  const getPendingTopic = useCallback((): { topic: TrendingTopic; stories: StoryResult[] } | null => {
    const stored = sessionStorage.getItem('pending-topic-analysis');
    if (stored) {
      sessionStorage.removeItem('pending-topic-analysis');
      return JSON.parse(stored);
    }
    return null;
  }, []);

  return {
    prepareTopicWorkspace,
    getPendingTopic,
  };
}

// === Create Integration ===

/**
 * Hook for bridging Topic Workspace to Create page
 */
export function useTopicToCreate() {
  const prepareCreateFromTopic = useCallback((
    intelligence: TopicIntelligence,
    selectedAngle: SuggestedAngle
  ) => {
    // Build research context for Create page
    const researchContext = {
      stories: intelligence.stories,
      notes: intelligence.synthesis.angles
        .find(a => a.id === selectedAngle.id)
        ?.description || '',
      focus: selectedAngle.thesis,
      analysis: {
        similarities: intelligence.analysis.themes.map(t => t.name),
        differences: intelligence.analysis.contradictions.map(c => c.topic),
        keyThemes: intelligence.analysis.patterns.map(p => p.name),
      },
    };

    // Store for Create page to pick up
    sessionStorage.setItem('create-research-context', JSON.stringify(researchContext));

    // Also store the selected angle details
    sessionStorage.setItem('create-selected-angle', JSON.stringify({
      angle: selectedAngle,
      topicName: intelligence.topic.name,
      hypothesis: intelligence.hypothesis.statement,
    }));
  }, []);

  const getTopicContext = useCallback(() => {
    const angleData = sessionStorage.getItem('create-selected-angle');
    if (angleData) {
      return JSON.parse(angleData);
    }
    return null;
  }, []);

  const clearTopicContext = useCallback(() => {
    sessionStorage.removeItem('create-selected-angle');
  }, []);

  return {
    prepareCreateFromTopic,
    getTopicContext,
    clearTopicContext,
  };
}

// === Storage Helpers ===

function loadWorkspaceState(): Partial<TopicWorkspaceState> | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(TOPIC_WORKSPACE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveWorkspaceState(state: TopicWorkspaceState) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(TOPIC_WORKSPACE_KEY, JSON.stringify({
    topic: state.topic,
    stories: state.stories,
    intelligence: state.intelligence,
    selectedAngle: state.selectedAngle,
    notes: state.notes,
  }));
}

function clearWorkspaceState() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOPIC_WORKSPACE_KEY);
}

function getStoredIntelligence(topicId: string): TopicIntelligence | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(`topic-intelligence-${topicId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeIntelligence(topicId: string, intelligence: TopicIntelligence) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`topic-intelligence-${topicId}`, JSON.stringify(intelligence));
}

function getNotes(topicId: string): TopicNote[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(`${TOPIC_NOTES_KEY}-${topicId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// === Utility Hooks ===

/**
 * Hook for getting topic readiness assessment
 */
export function useTopicReadiness(intelligence: TopicIntelligence | null) {
  if (!intelligence) {
    return {
      score: 0,
      label: 'Not Analyzed',
      recommendation: 'Run analysis to assess topic readiness',
    };
  }

  const { hypothesis, analysis, synthesis } = intelligence;

  // Weight: hypothesis confidence, analysis depth, synthesis originality
  const hypothesisScore = hypothesis.confidence;
  const analysisScore = Math.min(100, analysis.patterns.length * 20 + analysis.stakeholders.length * 15);
  const synthesisScore = synthesis.angles.length > 0
    ? synthesis.angles.reduce((sum, a) => sum + a.originalityScore, 0) / synthesis.angles.length
    : 0;

  const score = Math.round(hypothesisScore * 0.3 + analysisScore * 0.3 + synthesisScore * 0.4);

  let label: string;
  let recommendation: string;

  if (score >= 80) {
    label = 'Ready to Write';
    recommendation = 'Strong analysis complete. Pick an angle and start creating.';
  } else if (score >= 60) {
    label = 'Good Foundation';
    recommendation = 'Solid understanding. Consider deeper research on specific angles.';
  } else if (score >= 40) {
    label = 'Needs More Research';
    recommendation = 'Basic understanding. Gather more sources before writing.';
  } else {
    label = 'Early Stage';
    recommendation = 'Topic is still developing. Monitor for more coverage.';
  }

  return { score, label, recommendation };
}
