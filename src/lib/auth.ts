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