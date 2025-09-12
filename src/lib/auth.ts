// src/lib/auth.ts
import { supabase } from "./supabase";

export async function signIn(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

// ✅ теперь с паролем
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export const signOut = () => supabase.auth.signOut();
export const getUser = async () => (await supabase.auth.getUser()).data.user;

// ВНИЗ ФАЙЛА ДОБАВЬ:

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// Send password reset link to email
export async function sendPasswordReset(email: string) {
  const redirectTo = `${window.location.origin}/auth/reset`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
}

// Set a new password after following the recovery link
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}
