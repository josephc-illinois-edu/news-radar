'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Minus,
  HelpCircle,
  MessageCircle,
  Scissors,
  AlertTriangle,
  Pencil,
  X,
  Loader2,
  Check,
  RotateCcw,
} from 'lucide-react';
import type { EditorialPosition } from '@/types/database';
import type { FeedbackType, CreateRefinementInput } from '@/types/refinement';
import { FEEDBACK_PRESETS } from '@/types/refinement';

interface EditorialContext {
  editorial_position?: EditorialPosition;
  editorial_notes?: string;
  tone_humor?: number;
  tone_urgency?: number;
  tone_criticism?: number;
  tone_optimism?: number;
}

interface InlineRefinementProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  content: string;
  articleId?: string;
  onApply: (newContent: string) => void;
  editorialContext?: EditorialContext;
}

interface Selection {
  text: string;
  start: number;
  end: number;
}

interface RefinementResult {
  rewritten: string;
  tokens_used: number;
  estimated_cost: number;
}

const FEEDBACK_ICONS: Record<Exclude<FeedbackType, 'custom'>, typeof Minus> = {
  redundant: Minus,
  unclear: HelpCircle,
  tone: MessageCircle,
  wordy: Scissors,
  factual: AlertTriangle,
};

const MIN_SELECTION_LENGTH = 10;
const MAX_SELECTION_LENGTH = 2000;
const CONTEXT_WINDOW = 500;

export function InlineRefinement({
  textareaRef,
  content,
  articleId,
  onApply,
  editorialContext,
}: InlineRefinementProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({ top: 0, left: 0 });
  const [showCustom, setShowCustom] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [result, setResult] = useState<RefinementResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<FeedbackType | null>(null);

  // Calculate position from textarea selection
  const calculatePosition = useCallback((
    textarea: HTMLTextAreaElement,
    selectionStart: number
  ) => {
    const rect = textarea.getBoundingClientRect();
    const style = getComputedStyle(textarea);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingTop = parseFloat(style.paddingTop) || 16;
    const paddingLeft = parseFloat(style.paddingLeft) || 16;
    const fontSize = parseFloat(style.fontSize) || 14;

    // Get text before selection to count lines
    const textBefore = content.substring(0, selectionStart);
    const lines = textBefore.split('\n');
    const lineNumber = lines.length - 1;

    // Account for scroll position
    const scrollTop = textarea.scrollTop;

    // Calculate position
    const top = rect.top + paddingTop + (lineNumber * lineHeight) - scrollTop - 10;
    const left = rect.left + paddingLeft + Math.min(200, (lines[lines.length - 1]?.length || 0) * (fontSize * 0.6));

    return { top: Math.max(rect.top, top), left: Math.min(left, rect.right - 400) };
  }, [content]);

  // Handle text selection
  const handleSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;

    // Check if there's a selection
    if (selectionStart === selectionEnd) {
      return;
    }

    const selectedText = content.substring(selectionStart, selectionEnd);

    // Validate selection length
    if (selectedText.length < MIN_SELECTION_LENGTH) {
      return;
    }

    setSelection({
      text: selectedText,
      start: selectionStart,
      end: selectionEnd,
    });

    const position = calculatePosition(textarea, selectionStart);
    setAnchorPosition(position);
    setIsOpen(true);
    setShowCustom(false);
    setCustomInstruction('');
    setResult(null);
    setError(null);
    setActiveFeedback(null);
  }, [textareaRef, content, calculatePosition]);

  // Attach selection listeners
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      setTimeout(handleSelection, 10);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Only handle shift+arrow key selections
      if (e.shiftKey && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        handleSelection();
      }
    };

    textarea.addEventListener('mouseup', handleMouseUp);
    textarea.addEventListener('keyup', handleKeyUp);

    return () => {
      textarea.removeEventListener('mouseup', handleMouseUp);
      textarea.removeEventListener('keyup', handleKeyUp);
    };
  }, [textareaRef, handleSelection]);

  // Close popover when content changes externally
  useEffect(() => {
    if (isOpen && selection) {
      // Check if selection is still valid
      const currentSelection = content.substring(selection.start, selection.end);
      if (currentSelection !== selection.text) {
        handleClose();
      }
    }
  }, [content, isOpen, selection]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelection(null);
    setShowCustom(false);
    setCustomInstruction('');
    setResult(null);
    setError(null);
    setActiveFeedback(null);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleRefine = async (feedbackType: FeedbackType, instruction: string) => {
    if (!selection) return;

    setIsRefining(true);
    setError(null);
    setActiveFeedback(feedbackType);

    // Get context around selection
    const contextBefore = content.substring(
      Math.max(0, selection.start - CONTEXT_WINDOW),
      selection.start
    );
    const contextAfter = content.substring(
      selection.end,
      Math.min(content.length, selection.end + CONTEXT_WINDOW)
    );

    try {
      const response = await fetch('/api/articles/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: selection.text,
          instruction,
          mode: 'partial',
          context_before: contextBefore,
          context_after: contextAfter,
          model: 'haiku', // Always use Haiku for inline refinements
          ...editorialContext,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Refinement failed');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine text');
    } finally {
      setIsRefining(false);
    }
  };

  const handleApply = async () => {
    if (!selection || !result) return;

    // Replace selection in content
    const newContent =
      content.substring(0, selection.start) +
      result.rewritten +
      content.substring(selection.end);

    onApply(newContent);

    // Log refinement for learning
    await logRefinement(true);

    handleClose();
  };

  const handleDiscard = async () => {
    // Log discarded refinement
    if (result) {
      await logRefinement(false);
    }
    handleClose();
  };

  const logRefinement = async (applied: boolean) => {
    if (!selection || !activeFeedback) return;

    const instruction = activeFeedback === 'custom'
      ? customInstruction
      : FEEDBACK_PRESETS[activeFeedback as Exclude<FeedbackType, 'custom'>].instruction;

    const payload: CreateRefinementInput = {
      article_id: articleId || '',
      selection_text: selection.text,
      selection_start: selection.start,
      selection_end: selection.end,
      feedback_type: activeFeedback,
      instruction,
      before_text: selection.text,
      after_text: applied ? result?.rewritten || null : null,
      applied,
      model: 'haiku',
      tokens_used: result?.tokens_used || 0,
      cost: result?.estimated_cost || 0,
    };

    try {
      await fetch('/api/refinements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // Non-critical - don't fail on logging errors
      console.error('Failed to log refinement');
    }
  };

  const handlePresetClick = (type: Exclude<FeedbackType, 'custom'>) => {
    const preset = FEEDBACK_PRESETS[type];
    handleRefine(type, preset.instruction);
  };

  const handleCustomSubmit = () => {
    if (!customInstruction.trim()) return;
    handleRefine('custom', customInstruction);
  };

  const selectionTooLong = selection ? selection.text.length > MAX_SELECTION_LENGTH : false;

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <PopoverAnchor
        style={{
          position: 'fixed',
          top: anchorPosition.top,
          left: anchorPosition.left,
          width: 1,
          height: 1,
          pointerEvents: 'none',
        }}
      />
      <PopoverContent
        className="w-[380px] p-0"
        side="top"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-label="Refine selected text"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Refine Selection</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Selection preview */}
        <div className="border-b px-3 py-2">
          <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
            "{selection?.text.slice(0, 100)}{(selection?.text.length || 0) > 100 ? '...' : ''}"
          </p>
          {selectionTooLong && (
            <p className="mt-1 text-xs text-amber-600">
              Large selection ({selection?.text.length} chars). Consider using full Rewrite Assistant.
            </p>
          )}
        </div>

        {/* Quick feedback buttons */}
        {!result && !isRefining && (
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(FEEDBACK_PRESETS) as Array<Exclude<FeedbackType, 'custom'>>).map((type) => {
                const Icon = FEEDBACK_ICONS[type];
                const preset = FEEDBACK_PRESETS[type];
                return (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handlePresetClick(type)}
                    disabled={selectionTooLong}
                    aria-label={preset.instruction}
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {preset.label}
                  </Button>
                );
              })}
              <Button
                variant={showCustom ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowCustom(!showCustom)}
                disabled={selectionTooLong}
                aria-label="Enter custom instruction"
              >
                <Pencil className="mr-1 h-3 w-3" />
                Custom
              </Button>
            </div>

            {/* Custom instruction input */}
            {showCustom && (
              <div className="space-y-2 pt-2">
                <Textarea
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="Describe how you want this text changed..."
                  className="min-h-[60px] text-sm resize-none"
                  aria-label="Custom refinement instruction"
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleCustomSubmit}
                  disabled={!customInstruction.trim()}
                >
                  Refine
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {isRefining && (
          <div className="flex items-center justify-center p-6" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Refining...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-3">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setResult(null);
              }}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Try Again
            </Button>
          </div>
        )}

        {/* Result preview */}
        {result && !error && (
          <div className="p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
              <div className="rounded border bg-muted/50 p-2 max-h-[120px] overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{result.rewritten}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tokens: {result.tokens_used}</span>
              <span>Cost: ${result.estimated_cost.toFixed(4)}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={handleApply}
              >
                <Check className="mr-1 h-3 w-3" />
                Apply
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleDiscard}
              >
                Discard
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
