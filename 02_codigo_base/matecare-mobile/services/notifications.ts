import * as Notifications from 'expo-notifications';
import { isDevice } from 'expo-device';
import { apiFetch } from './api';
import Constants from 'expo-constants';

/**
 * Registra el token de notificaciones push del dispositivo en el backend.
 * Nota: En Expo Go SDK 53+, las notificaciones remotas tienen soporte limitado.
 */
export async function registerPushToken() {
  if (!isDevice) {
    console.log('[NOTIFICATIONS] Debe ser un dispositivo físico para notificaciones push');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[NOTIFICATIONS] Permiso de notificaciones denegado');
      return;
    }

    // Obtener el token de Expo
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    try {
      const token = (await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      )).data;
      
      console.log('[NOTIFICATIONS] Token obtenido:', token);
      
      // Registrar en nuestro backend
      await apiFetch('/notifications/register-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    } catch (tokenErr) {
      console.warn('[NOTIFICATIONS] No se pudo obtener el token (Posible limitación de Expo Go):', tokenErr);
    }

  } catch (error) {
    console.error('[NOTIFICATIONS] Error en el flujo de registro:', error);
  }
}
