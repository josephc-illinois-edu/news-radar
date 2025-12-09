import { NextResponse } from 'next/server';

export async function GET() {
  // Check which API keys are configured (don't expose the actual values)
  const keys = [
    {
      key: 'anthropic',
      label: 'Anthropic (Claude)',
      envVar: 'ANTHROPIC_API_KEY',
      configured: !!process.env.ANTHROPIC_API_KEY,
      docUrl: 'https://console.anthropic.com/',
    },
    {
      key: 'openai',
      label: 'OpenAI (DALL-E)',
      envVar: 'OPENAI_API_KEY',
      configured: !!process.env.OPENAI_API_KEY,
      docUrl: 'https://platform.openai.com/api-keys',
    },
    {
      key: 'guardian',
      label: 'The Guardian',
      envVar: 'GUARDIAN_API_KEY',
      configured: !!process.env.GUARDIAN_API_KEY,
      docUrl: 'https://open-platform.theguardian.com/',
    },
    {
      key: 'supabase_url',
      label: 'Supabase URL',
      envVar: 'NEXT_PUBLIC_SUPABASE_URL',
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      docUrl: 'https://supabase.com/',
    },
    {
      key: 'supabase_anon',
      label: 'Supabase Anon Key',
      envVar: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      docUrl: 'https://supabase.com/',
    },
  ];

  return NextResponse.json({
    success: true,
    data: keys,
  });
}
