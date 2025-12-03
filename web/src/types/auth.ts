import { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData extends LoginFormData {
  confirmPassword: string;
}
