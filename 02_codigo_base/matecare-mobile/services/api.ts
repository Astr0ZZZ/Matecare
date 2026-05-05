// Cliente HTTP con auth headers automáticos
const API_URL = process.env.EXPO_PUBLIC_API_URL

export async function apiFetch(path: string, options?: RequestInit) {
  // TODO: agregar Authorization header con token de Supabase
  return fetch(`${API_URL}${path}`, options)
}
