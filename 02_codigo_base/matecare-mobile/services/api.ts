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

  // Aseguramos que la URL base termine en /api si no lo tiene, y quitamos barras duplicadas
  let baseUrl = (API_URL || '').replace(/\/$/, ''); // Quitar barra final si existe
  if (baseUrl && !baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${cleanPath}`;
  console.log(`[API_FETCH] Calling: ${fullUrl}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`[API] TIMEOUT alcanzado (20s) para: ${fullUrl}`);
    controller.abort();
  }, 30000); // 30s timeout para mayor margen

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
