import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';

// Web-safe Speech API
const Speech = {
  speak: async (text: string, options?: any) => {
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate || 0.9;
      utterance.pitch = options?.pitch || 1.0;
      if (options?.language) utterance.lang = options.language;
      
      if (options?.onDone) {
        utterance.onend = options.onDone;
      }
      if (options?.onError) {
        utterance.onerror = options.onError;
      }
      
      window.speechSynthesis.speak(utterance);
      return Promise.resolve();
    }
    // Fallback for native - use expo-speech if available
    try {
      const ExpoSpeech = require('expo-speech');
      return await ExpoSpeech.speak(text, options);
    } catch {
      return Promise.resolve();
    }
  },
  stop: () => {
    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      try {
        const ExpoSpeech = require('expo-speech');
        ExpoSpeech.stop?.();
      } catch {
        // ignore
      }
    }
  },
  isSpeakingAsync: async () => false,
};
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { apiService } from '../../services/api';
import { useLocation } from '../../hooks/useLocation';
import { useHazards } from '../../hooks/useHazards';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isVoice?: boolean;
}

export default function ChatbotScreen() {
  const navigation = useNavigation();
  const { location } = useLocation();
  const { hazards } = useHazards();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Hello! I'm RoadGuard AI, your intelligent road safety assistant. I can help you with real-time hazard information, navigation guidance, and answer questions about road safety. How can I assist you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Voice recording setup
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Failed to setup audio:', error);
      }
    };

    setupAudio();
  }, []);

  const startRecording = async () => {
    try {
      setIsRecording(true);

      const recording = new Audio.Recording();
      recordingRef.current = recording;

      await recording.prepareToRecordAsync();
      await recording.startAsync();

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, 10000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start voice recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();

      const uri = recordingRef.current.getURI();
      if (uri) {
        // Here you would typically send the audio file to a speech-to-text service
        // For now, we'll simulate this with a placeholder
        const transcribedText = "Voice input received (speech-to-text would process this)";
        setInputText(transcribedText);
        sendMessage(transcribedText, true);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  };

  const speakMessage = async (text: string) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);

    try {
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  };

  const sendMessage = async (text: string = inputText, isVoice: boolean = false) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
      isVoice,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Prepare context for AI
      const context = {
        location,
        nearbyHazards: hazards.filter(h => h.distance && h.distance < 5),
        currentTime: new Date().toISOString(),
        userQuery: text.trim(),
      };

      const response = await apiService.sendMessage(text.trim(), context);

      if (response.success && response.data) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response.data.response,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);

        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        throw new Error(response.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please check your internet connection and try again.",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessageContainer : styles.aiMessageContainer
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userMessageBubble : styles.aiMessageBubble
      ]}>
        {item.isVoice && item.isUser && (
          <Text style={styles.voiceIndicator}>🎤 </Text>
        )}
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userMessageText : styles.aiMessageText
        ]}>
          {item.text}
        </Text>
      </View>

      {!item.isUser && (
        <TouchableOpacity
          style={styles.speakButton}
          onPress={() => speakMessage(item.text)}
        >
          <Text style={styles.speakButtonText}>
            {isSpeaking ? '⏸️' : '🔊'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  const getQuickSuggestions = () => {
    const suggestions = [
      "What's the safest route to downtown?",
      "Are there any hazards near me?",
      "How does the sensor fusion work?",
      "Tell me about road safety tips",
      "What's my current location status?",
    ];

    // Filter out suggestions that are too similar to recent messages
    const recentTexts = messages.slice(-3).map(m => m.text.toLowerCase());
    return suggestions.filter(suggestion =>
      !recentTexts.some(recent =>
        recent.includes(suggestion.toLowerCase().slice(0, 20))
      )
    ).slice(0, 3);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>RoadGuard AI</Text>
          <Text style={styles.headerSubtitle}>
            {isLoading ? 'Thinking...' : 'Online'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, isSpeaking && styles.headerButtonActive]}
            onPress={() => {
              if (isSpeaking) {
                Speech.stop();
                setIsSpeaking(false);
              }
            }}
          >
            <Text style={styles.headerButtonText}>🔊</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick Suggestions */}
      {messages.length === 1 && !isLoading && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Quick Questions</Text>
          <View style={styles.suggestionsList}>
            {getQuickSuggestions().map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionButton}
                onPress={() => sendMessage(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about road safety..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
          />

          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.voiceButtonText}>
              {isRecording ? '⏹️' : '🎤'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <Text style={styles.recordingText}>🎤 Recording... Tap to stop</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.text.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.text.sm,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  headerButtonActive: {
    backgroundColor: colors.accent,
  },
  headerButtonText: {
    fontSize: 16,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  messageContainer: {
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userMessageBubble: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  voiceIndicator: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  messageText: {
    ...typography.text.md,
    lineHeight: 20,
    flex: 1,
  },
  userMessageText: {
    color: colors.text,
  },
  aiMessageText: {
    color: colors.text,
  },
  speakButton: {
    marginTop: spacing.xs,
    padding: spacing.xs,
  },
  speakButtonText: {
    fontSize: 16,
  },
  timestamp: {
    ...typography.text.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  suggestionsTitle: {
    ...typography.text.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  suggestionsList: {
    gap: spacing.sm,
  },
  suggestionButton: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  suggestionText: {
    ...typography.text.md,
    color: colors.text,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  loadingText: {
    ...typography.text.sm,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    ...typography.text.md,
    color: colors.text,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  voiceButtonRecording: {
    backgroundColor: colors.danger,
  },
  voiceButtonText: {
    fontSize: 18,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceLight,
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  recordingIndicator: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  recordingText: {
    ...typography.text.sm,
    color: colors.danger,
    fontWeight: typography.fontWeight.medium,
  },
});