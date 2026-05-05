import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { CONFIG } from '../../constants/config';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: '¡Hola! Soy tu asistente táctico. ¿Qué está pasando hoy o qué necesitas saber sobre el estado de tu pareja?', sender: 'ai' },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMsg: Message = { id: Date.now().toString(), text: inputText, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await fetch(`${CONFIG.API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: CONFIG.TEST_USER_ID,
          message: inputText,
          history: messages.map(m => ({ role: m.sender === 'ai' ? 'assistant' : 'user', content: m.text }))
        })
      });

      const data = await response.json();
      const aiMsg: Message = { id: (Date.now() + 1).toString(), text: data.response, sender: 'ai' };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { id: 'error', text: 'Error de conexión. Inténtalo de nuevo.', sender: 'ai' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MateCare AI</Text>
        <View style={styles.onlineBadge} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
        style={{ flex: 1 }}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messageList, { flexGrow: 1, justifyContent: 'flex-end' }]}
          renderItem={({ item }) => (
            <MotiView 
              from={{ opacity: 0, scale: 0.9, translateX: item.sender === 'ai' ? -20 : 20 }}
              animate={{ opacity: 1, scale: 1, translateX: 0 }}
              style={[
                styles.bubble,
                item.sender === 'ai' ? styles.aiBubble : styles.userBubble
              ]}
            >
              <Text style={[
                styles.messageText,
                item.sender === 'ai' ? styles.aiText : styles.userText
              ]}>
                {item.text}
              </Text>
            </MotiView>
          )}
        />

        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            placeholder="Pregúntale algo a la IA..."
            placeholderTextColor={COLORS.light.textMuted}
            value={inputText}
            onChangeText={setInputText}
            editable={!loading}
          />
          <TouchableOpacity 
            style={[styles.sendButton, loading && { opacity: 0.5 }]} 
            onPress={sendMessage}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.light.bgPrimary },
  header: { padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.light.divider },
  title: { fontFamily: TYPOGRAPHY.fontFamily.bold, fontSize: 18, color: COLORS.light.greenDark, marginRight: 8 },
  onlineBadge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  messageList: { padding: SPACING.lg },
  bubble: { maxWidth: '85%', padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.md },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.light.bgCard, borderBottomLeftRadius: 0, borderWidth: 1, borderColor: COLORS.light.divider },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.light.greenDark, borderBottomRightRadius: 0 },
  messageText: { fontFamily: TYPOGRAPHY.fontFamily.regular, fontSize: 15, lineHeight: 22 },
  aiText: { color: COLORS.light.textPrimary },
  userText: { color: '#fff' },
  inputContainer: { flexDirection: 'row', padding: SPACING.md, backgroundColor: '#fff', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.light.divider },
  input: { flex: 1, height: 45, backgroundColor: COLORS.light.bgPrimary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, fontFamily: TYPOGRAPHY.fontFamily.regular, fontSize: 14, marginRight: SPACING.sm },
  sendButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: COLORS.light.greenDark, justifyContent: 'center', alignItems: 'center' },
});
