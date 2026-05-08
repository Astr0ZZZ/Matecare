import * as Notifications from 'expo-notifications';
import { isDevice } from 'expo-device';
import { apiFetch } from './api';
import { Platform } from 'react-native';

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
      console.log('[NOTIFICATIONS] Permiso denegado');
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('[NOTIFICATIONS] Token registrado:', token);
    
    await apiFetch('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  } catch (error) {
    console.error('[NOTIFICATIONS] Error registrando token:', error);
  }
}
