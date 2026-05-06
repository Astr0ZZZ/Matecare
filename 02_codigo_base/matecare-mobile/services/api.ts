import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function apiFetch(path: string, options?: RequestInit) {
  if (!API_URL) {
    console.warn("⚠️ EXPO_PUBLIC_API_URL no está definida en el entorno.");
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options?.headers,
  };

  const fullUrl = `${API_URL || ''}${path}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout para Gemini 3

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Error en apiFetch (${path}):`, error);
    throw error;
  }
}
