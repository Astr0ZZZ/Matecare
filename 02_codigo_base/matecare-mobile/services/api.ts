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

  // Aseguramos que la URL base termine en /api si no lo tiene
  let baseUrl = API_URL || '';
  if (baseUrl && !baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }

  const fullUrl = `${baseUrl}${path}`;
  console.log(`[API_FETCH] Calling: ${fullUrl}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout para IA 2026

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.log('[API] Petición cancelada o timeout:', fullUrl);
    }
    console.error(`Error en apiFetch (${path}):`, error.message || error);
    throw error;
  }
}
