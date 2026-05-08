import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const ENDPOINT_TIMEOUTS: Record<string, number> = {
  '/ai/vision-chat': 35_000,       // Vision puede tardar hasta 30s con VPS frío
  '/ai/calibrate-profile': 35_000, // Igual
  '/ai/chat': 20_000,              // Chat estándar
  '/ai/recommendation': 15_000,    // Recomendación diaria
  default: 20_000,
};

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
  
  const controller = new AbortController();
  
  // Determinar timeout según el path
  const matchedKey = Object.keys(ENDPOINT_TIMEOUTS).find(k => cleanPath.startsWith(k));
  const timeoutMs = ENDPOINT_TIMEOUTS[matchedKey || 'default'];

  const timeoutId = setTimeout(() => {
    console.warn(`[API] TIMEOUT (${timeoutMs}ms) para: ${fullUrl}`);
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Error especial de quality gate — tiene userMessage del backend
      if (response.status === 422 && errorData.reason) {
        const qualityError = new Error(errorData.userMessage || 'Imagen rechazada por calidad');
        (qualityError as any).reason = errorData.reason;
        (qualityError as any).isQualityError = true;
        throw qualityError;
      }

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
