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
import { useToast } from '../../context/ToastContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function Chat() {
  const { mensajes, enviarMensaje, cargando, limpiarHistorial } = useAIChat();
  const { showError } = useToast();
  const [inputText, setInputText] = useState('');
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


  const handleSend = async () => {
    if (!inputText.trim() || cargando) return;
    const text = inputText;
    setInputText('');
    await enviarMensaje(text);
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
            <Text style={[styles.subtitle, { color: theme?.colors?.textMuted || '#8F8F8F', fontFamily: theme?.typography?.boldFont }]}>Sistema Táctico</Text>
          </View>
          <TouchableOpacity onPress={limpiarHistorial} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={20} color={theme?.colors?.textMuted || '#8F8F8F'} />
          </TouchableOpacity>
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
              <View style={[styles.messageWrapper, item.emisor === 'ia' ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' }]}>
                {item.emisor === 'ia' && (
                  <View style={styles.botHeader}>
                    <Text style={[styles.botName, { color: theme.colors.accent, fontFamily: theme.typography.boldFont }]}>MATECARE AI</Text>
                    <View style={styles.onlineDot} />
                  </View>
                )}

                <MotiView
                  from={{ opacity: 0, scale: 0.9, translateY: 10 }}
                  animate={{ opacity: 1, scale: 1, translateY: 0 }}
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

                <Text style={[styles.timestamp, { alignSelf: item.emisor === 'ia' ? 'flex-start' : 'flex-end', color: theme.colors.textMuted }]}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <Text style={[styles.emptyText, { color: theme?.colors?.textMuted || '#8F8F8F' }]}>Inicia la conversación táctica...</Text>
            )}
          />

          <View style={[styles.inputContainer, { backgroundColor: theme?.colors?.background, borderTopColor: 'rgba(255,255,255,0.1)' }]}>
            {/* 
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="mic-outline" size={24} color={theme.colors.textMuted} />
            </TouchableOpacity> 
            */}
            <TextInput
              style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.05)', color: theme?.colors?.text || '#FFF', fontFamily: theme?.typography?.bodyFont }]}
              placeholder="Escribe tu mensaje..."
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
              {cargando ? <ActivityIndicator color="#000" size="small" /> : <Ionicons name="send" size={18} color="#000" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  subtitle: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 },
  onlineBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', borderWidth: 2 },
  messageList: { padding: SPACING.lg, paddingBottom: 20 },
  messageWrapper: { marginBottom: 20, maxWidth: '85%' },
  botHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginLeft: 4 },
  botName: { fontSize: 10, letterSpacing: 2 },
  onlineDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4CAF50', marginLeft: 6 },
  bubble: { padding: 16, borderRadius: 20 },
  aiBubble: { borderTopLeftRadius: 4, borderWidth: 1 },
  userBubble: { borderTopRightRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 22 },
  timestamp: { fontSize: 10, marginTop: 4, opacity: 0.6, marginHorizontal: 8 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 13, letterSpacing: 1 },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderTopWidth: 0.5 },
  attachButton: { marginRight: 12 },
  input: { flex: 1, height: 48, borderRadius: 24, paddingHorizontal: 20, fontSize: 15, marginRight: 12 },
  sendButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
});
