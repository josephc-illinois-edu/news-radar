'use client';

import { useState } from 'react';
import { Check, ChevronDown, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ScanConfig, ScanPreset } from '@/types/scanner';
import { cn } from '@/lib/utils';

interface PresetSelectorProps {
  presets: ScanPreset[];
  activePresetId: string | null;
  currentConfig: ScanConfig;
  onApplyPreset: (preset: ScanPreset) => void;
  onSavePreset: (name: string, config: ScanConfig) => void;
  onDeletePreset: (id: string) => void;
}

export function PresetSelector({
  presets,
  activePresetId,
  currentConfig,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
}: PresetSelectorProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const activePreset = presets.find((p) => p.id === activePresetId);
  const builtInPresets = presets.filter((p) => p.id.startsWith('builtin-'));
  const userPresets = presets.filter((p) => !p.id.startsWith('builtin-'));

  const handleSave = () => {
    if (newPresetName.trim()) {
      onSavePreset(newPresetName.trim(), currentConfig);
      setNewPresetName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 min-w-[140px] justify-between">
              <span className="truncate">
                {activePreset?.name || 'Select Preset'}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {/* Built-in presets */}
            {builtInPresets.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Built-in Presets
                </div>
                {builtInPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    className="gap-2"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        activePresetId === preset.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex-1">{preset.name}</span>
                    {preset.isDefault && (
                      <span className="text-xs text-muted-foreground">Default</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {/* User presets */}
            {userPresets.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Your Presets
                </div>
                {userPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    className="gap-2 group"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyPreset(preset);
                      }}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Check
                        className={cn(
                          'h-4 w-4',
                          activePresetId === preset.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span>{preset.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePreset(preset.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive"
                      aria-label={`Delete ${preset.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {/* Save new preset */}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowSaveDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Save Current as Preset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick save button when preset is modified */}
        {activePreset && !activePreset.id.startsWith('builtin-') && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSavePreset(activePreset.name, currentConfig)}
            title="Update preset with current settings"
            className="h-8 w-8"
          >
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Save preset dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Save your current scan configuration as a preset for quick access later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="My Custom Preset"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Current Configuration:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{currentConfig.sources.length} sources selected</li>
                <li>{currentConfig.hoursBack}h time window</li>
                {currentConfig.minScore > 0 && <li>Min score: {currentConfig.minScore}</li>}
                {currentConfig.keywords.length > 0 && (
                  <li>{currentConfig.keywords.length} keyword filters</li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!newPresetName.trim()}>
              Save Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
