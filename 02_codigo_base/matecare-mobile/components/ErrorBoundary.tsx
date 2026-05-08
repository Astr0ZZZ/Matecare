import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>ALGO FALLÓ EN LA MATRIZ</Text>
          <Text style={styles.subtitle}>Se ha detectado una anomalía crítica en el sistema.</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.retry}>REINTENTAR SINCRONIZACIÓN</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#044422', padding: 30 },
  title: { color: '#CFAA3C', fontSize: 18, marginBottom: 10, fontWeight: 'bold', letterSpacing: 2 },
  subtitle: { color: '#FFF', fontSize: 12, marginBottom: 30, textAlign: 'center', opacity: 0.7 },
  button: { padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#CFAA3C' },
  retry: { color: '#CFAA3C', fontSize: 12, letterSpacing: 1, fontWeight: 'bold' },
});
