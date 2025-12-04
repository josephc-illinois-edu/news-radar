'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from './server';

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();

  // Demo mode - skip auth and go directly to dashboard
  if (!supabase) {
    revalidatePath('/', 'layout');
    redirect('/dashboard');
  }

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();

  // Demo mode - skip signup and go directly to dashboard
  if (!supabase) {
    revalidatePath('/', 'layout');
    return { success: 'Demo mode - no signup needed' };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signUp({
    ...data,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: 'Check your email to confirm your account' };
}

export async function signOut() {
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function signInWithOAuth(provider: 'google' | 'github') {
  const supabase = await createClient();

  // Demo mode - redirect to dashboard
  if (!supabase) {
    redirect('/dashboard');
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function getUser() {
  const supabase = await createClient();

  // Demo mode - return null user
  if (!supabase) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
