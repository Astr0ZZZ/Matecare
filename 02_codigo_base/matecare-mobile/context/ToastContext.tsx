import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const ToastContext = createContext({ showError: (msg: string) => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const opacity = useState(new Animated.Value(0))[0];

  const showError = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showError }}>
      {children}
      {visible && (
        <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', bottom: 100, left: 20, right: 20,
    backgroundColor: '#3B0000', borderRadius: 12,
    padding: 16, zIndex: 9999,
    borderWidth: 1, borderColor: '#FF444450',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5
  },
  text: { color: '#FF6B6B', textAlign: 'center', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
});
