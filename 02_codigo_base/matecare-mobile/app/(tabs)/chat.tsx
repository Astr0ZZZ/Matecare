import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useAIChat } from '../../hooks/useAIChat';
import { apiFetch } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function Chat() {
  const { mensajes, enviarMensaje, cargando } = useAIChat();
  const [inputText, setInputText] = useState('');
  const [faseActual, setFaseActual] = useState('DESCONOCIDA');
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const renderFormattedText = (text: string, isAi: boolean) => {
    if (!text) return null;
    const cleanText = text.replace(/(^|\n)\*\s/g, '$1• ');
    const parts = cleanText.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={[
            styles.messageText, 
            isAi ? { color: theme.colors.text } : { color: '#000' },
            { fontFamily: theme.typography.boldFont }
          ]}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return (
        <Text key={index} style={[
          styles.messageText, 
          isAi ? { color: theme.colors.textMuted } : { color: '#000' },
          { fontFamily: theme.typography.bodyFont }
        ]}>
          {part}
        </Text>
      );
    });
  };

  useEffect(() => {
    const fetchPhase = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const res = await apiFetch(`/api/ai/recommendation/${user.id}`);
          if (res.ok) {
            const data = await res.json();
            setFaseActual(data.cycle.phase);
          }
        }
      } catch (error: any) {
        if (
          error.name === 'AbortError' || 
          error.message === 'Aborted' || 
          String(error).includes('Aborted')
        ) {
          console.log('[Chat] Petición cancelada (Ignorado)');
          return;
        }
        console.error("Error cargando fase para chat:", error);
      }
    };
    fetchPhase();
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || cargando) return;
    const text = inputText;
    setInputText('');
    await enviarMensaje(text, faseActual);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <LinearGradient 
      colors={[theme?.colors?.background || '#044422', theme?.colors?.primary || '#044422']} 
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { backgroundColor: theme?.colors?.card || 'rgba(0,0,0,0.1)', borderBottomColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' }]}>
          <View>
            <Text style={[styles.title, { color: theme?.colors?.accent || '#CFAA3C', fontFamily: theme?.typography?.boldFont }]}>MateCare AI</Text>
            <Text style={[styles.subtitle, { color: theme?.colors?.textMuted || '#8F8F8F', fontFamily: theme?.typography?.boldFont }]}>Fase: {faseActual}</Text>
          </View>
          <View style={[styles.onlineBadge, { borderColor: theme?.colors?.card || 'rgba(0,0,0,0.1)' }]} />
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={flatListRef}
            data={mensajes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            removeClippedSubviews={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <MotiView 
                from={{ opacity: 0, scale: 0.9, translateX: item.emisor === 'ia' ? -20 : 20 }}
                animate={{ opacity: 1, scale: 1, translateX: 0 }}
                style={[
                  styles.bubble,
                  item.emisor === 'ia' 
                    ? [styles.aiBubble, { backgroundColor: theme?.colors?.card || 'rgba(255,255,255,0.1)', borderColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' }] 
                    : [styles.userBubble, { backgroundColor: theme?.colors?.accent || '#CFAA3C' }]
                ]}
              >
                <Text>
                  {item.text ? renderFormattedText(item.text, item.emisor === 'ia') : null}
                </Text>
              </MotiView>
            )}
            ListEmptyComponent={() => (
              <Text style={[styles.emptyText, { color: theme?.colors?.textMuted || '#8F8F8F' }]}>Inicia la conversación táctica...</Text>
            )}
          />

          <View style={[styles.inputContainer, { backgroundColor: theme?.colors?.card || 'rgba(0,0,0,0.1)', borderTopColor: theme?.colors?.border || 'rgba(255,255,255,0.1)' }]}>
            <TextInput 
              style={[styles.input, { backgroundColor: theme?.colors?.background || '#044422', color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.bodyFont }]}
              placeholder="Pregúntale algo a la IA..."
              placeholderTextColor={theme?.colors?.textMuted || '#8F8F8F'}
              value={inputText}
              onChangeText={setInputText}
              editable={!cargando}
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity 
              style={[styles.sendButton, { backgroundColor: theme?.colors?.accent || '#CFAA3C' }, cargando && { opacity: 0.5 }]} 
              onPress={handleSend}
              disabled={cargando}
            >
              {cargando ? <ActivityIndicator color="#000" size="small" /> : <Ionicons name="send" size={20} color="#000" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  title: { fontSize: 18 },
  subtitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  onlineBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', borderWidth: 2 },
  messageList: { padding: SPACING.lg, paddingBottom: 20 },
  bubble: { maxWidth: '85%', padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 0, borderWidth: 1 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 0 },
  messageText: { fontSize: 15, lineHeight: 22 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 14 },
  inputContainer: { flexDirection: 'row', padding: SPACING.md, alignItems: 'center', borderTopWidth: 1 },
  input: { flex: 1, height: 45, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, fontSize: 14, marginRight: SPACING.sm },
  sendButton: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
});
