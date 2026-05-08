import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Constants from 'expo-constants';

export const NotificationManager = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (session) {
      registerForPushNotificationsAsync()
        .then(token => {
          if (token) {
            sendTokenToBackend(token);
          }
        })
        .catch(err => console.log('[NOTIF] Registro omitido:', err));
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('[NOTIF] Recibida:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[NOTIF] Respuesta del usuario:', response);
    });

    return () => {
      // Nueva forma de remover suscripciones en SDK 50+
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [session]);

  const sendTokenToBackend = async (token: string) => {
    try {
      await apiFetch('/profile/push-token', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
    } catch (e) {
      // Silencioso en desarrollo
    }
  };

  return <>{children}</>;
};

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#CFAA3C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    
    try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId || 
                          Constants?.easConfig?.projectId || 
                          'c78c7023-d776-4404-8908-4a04791bc68f'; // ID de tu proyecto actual
        
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
        // Fallback para Expo Go
    }
  }

  return token;
}

export const triggerLocalNotification = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🛡️ MATECARE: ${title}`,
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch (e) {
    console.log('[NOTIF] Error local:', e);
  }
};
