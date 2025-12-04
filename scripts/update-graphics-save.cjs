const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'web', 'src', 'app', 'dashboard', 'graphics', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add isSaving state
content = content.replace(
  'const [error, setError] = useState<string | null>(null);',
  `const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);`
);

// Add handleSaveToLibrary function before handleGenerate
const handleGenerateStart = 'const handleGenerate = async () => {';
const handleSaveFunction = `const handleSaveToLibrary = async () => {
    if (!result) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: result.url,
          title,
          platform: result.platform,
          style: result.style,
          generationMode: mode,
          prompt: result.prompt,
          width: result.width,
          height: result.height,
          cost: result.cost || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      const saved = await response.json();
      setSavedUrl(saved.public_url || result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save image');
    } finally {
      setIsSaving(false);
    }
  };

  ${handleGenerateStart}`;

content = content.replace(handleGenerateStart, handleSaveFunction);

// Reset savedUrl when generating new image
content = content.replace(
  'setResult(null);\n\n    try {',
  'setResult(null);\n    setSavedUrl(null);\n\n    try {'
);

// Add Save to Library button in the buttons section
const oldButtons = `<div className="flex gap-2">
                  <Button onClick={handleDownload}>
                    Download Image
                  </Button>
                  <Button variant="outline" onClick={handleCopyUrl}>
                    Copy URL
                  </Button>
                  <Button variant="outline" onClick={handleGenerate}>
                    Regenerate
                  </Button>
                </div>`;

const newButtons = `<div className="flex gap-2 flex-wrap">
                  <Button onClick={handleDownload}>
                    Download Image
                  </Button>
                  <Button variant="outline" onClick={handleCopyUrl}>
                    Copy URL
                  </Button>
                  <Button variant="outline" onClick={handleGenerate}>
                    Regenerate
                  </Button>
                  <Button
                    variant={savedUrl ? "secondary" : "default"}
                    onClick={handleSaveToLibrary}
                    disabled={isSaving || !!savedUrl}
                  >
                    {isSaving ? 'Saving...' : savedUrl ? 'Saved to Library' : 'Save to Library'}
                  </Button>
                </div>
                {savedUrl && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Image saved to library for future use
                  </p>
                )}`;

content = content.replace(oldButtons, newButtons);

fs.writeFileSync(file, content);
console.log('Added save to library functionality to graphics page');
