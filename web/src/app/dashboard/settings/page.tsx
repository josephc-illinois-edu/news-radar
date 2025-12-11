'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Key,
  Link2,
  Bell,
  Shield,
  Palette,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface ApiKeyStatus {
  key: string;
  label: string;
  envVar: string;
  configured: boolean;
  docUrl?: string;
}

interface PlatformConnection {
  platform: string;
  name: string;
  connected: boolean;
  description: string;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus[]>([]);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Only render theme after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      // Check API key status
      const keysResponse = await fetch('/api/settings/keys');
      const keysData = await keysResponse.json();
      setApiKeys(keysData.data || []);

      // Check platform connections
      const connectionsResponse = await fetch('/api/publish/connections');
      const connectionsData = await connectionsResponse.json();
      setConnections(connectionsData.data || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
      // Set default values for demo mode
      setApiKeys([
        {
          key: 'anthropic',
          label: 'Anthropic (Claude)',
          envVar: 'ANTHROPIC_API_KEY',
          configured: false,
          docUrl: 'https://console.anthropic.com/',
        },
        {
          key: 'openai',
          label: 'OpenAI (DALL-E)',
          envVar: 'OPENAI_API_KEY',
          configured: false,
          docUrl: 'https://platform.openai.com/api-keys',
        },
        {
          key: 'guardian',
          label: 'The Guardian',
          envVar: 'GUARDIAN_API_KEY',
          configured: false,
          docUrl: 'https://open-platform.theguardian.com/',
        },
        {
          key: 'supabase',
          label: 'Supabase',
          envVar: 'NEXT_PUBLIC_SUPABASE_URL',
          configured: false,
          docUrl: 'https://supabase.com/',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const configuredCount = apiKeys.filter(k => k.configured).length;
  const totalKeys = apiKeys.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your API keys, connections, and preferences
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" aria-hidden="true" />
            <span>API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="connections" className="gap-2">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            <span>Connections</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" aria-hidden="true" />
            <span>Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" aria-hidden="true" />
            <span>Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Configuration</CardTitle>
                  <CardDescription>
                    Configure external service API keys for full functionality
                  </CardDescription>
                </div>
                <Badge
                  variant={configuredCount === totalKeys ? 'default' : 'secondary'}
                >
                  {configuredCount}/{totalKeys} configured
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Warning banner */}
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">API keys are configured via environment variables</p>
                  <p className="text-muted-foreground mt-1">
                    Create a <code className="px-1 py-0.5 bg-muted rounded">.env.local</code> file
                    in your project root with the required keys. Never commit API keys to git.
                  </p>
                </div>
              </div>

              <Separator />

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => (
                    <div
                      key={apiKey.key}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {apiKey.configured ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" aria-label="Configured" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" aria-label="Not configured" />
                        )}
                        <div>
                          <p className="font-medium">{apiKey.label}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {apiKey.envVar}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={apiKey.configured ? 'default' : 'outline'}>
                          {apiKey.configured ? 'Configured' : 'Not Set'}
                        </Badge>
                        {apiKey.docUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={apiKey.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Get ${apiKey.label} API key`}
                            >
                              <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Example .env.local:</p>
                <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
{`ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GUARDIAN_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Connections</CardTitle>
              <CardDescription>
                Connect your social media and publishing accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Substack - configured via env vars */}
              {connections.find(c => c.platform === 'substack')?.connected && (
                <div className="flex items-start gap-3 rounded-lg border border-green-500/50 bg-green-500/5 p-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Substack Connected</p>
                    <p className="text-muted-foreground mt-1">
                      Your Substack newsletter is configured and ready for publishing via browser automation.
                    </p>
                  </div>
                </div>
              )}

              {!connections.find(c => c.platform === 'substack')?.connected && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Substack Not Configured</p>
                    <p className="text-muted-foreground mt-1">
                      Add SUBSTACK_EMAIL, SUBSTACK_PASSWORD, and SUBSTACK_PUBLICATION_URL to your .env.local file to enable Substack publishing.
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                {/* Substack - actual status from API */}
                {connections.filter(c => c.platform === 'substack').map((conn) => (
                  <div
                    key={conn.platform}
                    className={`flex items-center justify-between p-4 rounded-lg border ${conn.connected ? 'border-green-500/30 bg-green-500/5' : 'bg-muted/30'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-white">
                        S
                      </div>
                      <div>
                        <p className="font-medium">Substack</p>
                        <p className="text-sm text-muted-foreground">
                          {conn.connected ? conn.name : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={conn.connected ? 'default' : 'outline'}>
                      {conn.connected ? 'Connected' : 'Not Configured'}
                    </Badge>
                  </div>
                ))}

                <p className="text-sm text-muted-foreground pt-2">
                  Connect your social accounts (Twitter/X, Facebook, LinkedIn) directly in your{' '}
                  <a
                    href="https://substack.com/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Substack settings
                  </a>
                  {' '}to auto-share when publishing.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="theme-select">Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred color scheme
                  </p>
                </div>
                {mounted && (
                  <div className="flex gap-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('light')}
                    >
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                    >
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('system')}
                    >
                      System
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="compact-mode">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use smaller spacing and font sizes
                  </p>
                </div>
                <Switch id="compact-mode" disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="animations">Animations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable UI animations and transitions
                  </p>
                </div>
                <Switch id="animations" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="publish-notifications">Publishing Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when content is published
                  </p>
                </div>
                <Switch id="publish-notifications" defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="engagement-notifications">Engagement Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts for comments and interactions
                  </p>
                </div>
                <Switch id="engagement-notifications" defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="analytics-notifications">Analytics Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Weekly performance summary emails
                  </p>
                </div>
                <Switch id="analytics-notifications" />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="scanner-notifications">Scanner Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when trending topics are detected
                  </p>
                </div>
                <Switch id="scanner-notifications" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
