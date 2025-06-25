/**
 * Optimized chat hooks for performance improvements
 * Phase 2: Performance Improvements
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDebouncedCallback, useExpensiveMemo } from '../utils/performance';
import { useChatStore } from '../stores/useChatStore';
import { Message } from '../lib/types';

/**
 * Optimized hook for message sorting and filtering
 */
export const useOptimizedMessages = (messages: Message[]) => {
  // Memoize sorted messages to prevent unnecessary re-sorting
  const sortedMessages = useExpensiveMemo(() => {
      return [...messages].sort((a, b) => 
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
      );
  }, [messages]);

  // Memoize pinned messages
  const pinnedMessages = useMemo(() => {
    return messages.filter(msg => msg.isPinned);
  }, [messages]);

  // Memoize message groups by date
  const messageGroups = useExpensiveMemo(() => {
    const groups: { [date: string]: Message[] } = {};
    
    sortedMessages.forEach(message => {
      const date = new Date(message.timestamp || 0).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });;
    
    return groups;
  }, [sortedMessages]);

  return {
    sortedMessages,
    pinnedMessages,
    messageGroups
  };
};

/**
 * Optimized hook for typing indicators with debouncing
 */
export const useOptimizedTyping = (chatId: string, userId: string) => {
  const [isTyping, setIsTyping] = useState(false);
  const [otherUsersTyping, setOtherUsersTyping] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced typing indicator to prevent excessive API calls
  const debouncedSetTyping = useDebouncedCallback(
    (typing: boolean) => {
      // Here you would typically send typing status to the server
      // realtimeService.sendTypingStatus(chatId, userId, typing);
      if (__DEV__) {
        console.log(`User ${userId} typing status: ${typing}`);
      }
    },
    300
  );

  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      debouncedSetTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        debouncedSetTyping(false);
      }, 3000);
  }, [isTyping, debouncedSetTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    debouncedSetTyping(false);
  }, [debouncedSetTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    otherUsersTyping,
    startTyping,
    stopTyping,
    setOtherUsersTyping
  };
};

/**
 * Optimized hook for message input with debounced auto-save
 */
export const useOptimizedMessageInput = (initialValue: string = '') => {
  const [inputText, setInputText] = useState(initialValue);
  const [draftSaved, setDraftSaved] = useState(true);

  // Debounced draft saving
  const debouncedSaveDraft = useDebouncedCallback(
    (text: string, chatId: string) => {
      if (text.trim()) {
        // Save draft to local storage or server
        // AsyncStorage.setItem(`draft_${chatId}`, text);
        setDraftSaved(true);
        if (__DEV__) {
          console.log(`Draft saved for chat ${chatId}`);
        }
      }
    },
    1000
  );

  const updateInputText = useCallback((text: string, chatId?: string) => {
    setInputText(text);
    setDraftSaved(false);
    
    if (chatId) {
      debouncedSaveDraft(text, chatId);
    }
  }, [debouncedSaveDraft]);

  const clearInput = useCallback(() => {
    setInputText('');
    setDraftSaved(true);
  }, []);

  return {
    inputText,
    draftSaved,
    updateInputText,
    clearInput,
    setInputText
  };
};

/**
 * Optimized hook for message sending with retry logic
 */
export const useOptimizedMessageSending = () => {
  const { sendMessage } = useChatStore();
  const [sendingMessages, setSendingMessages] = useState<Set<string>>(new Set());
  const [failedMessages, setFailedMessages] = useState<Set<string>>(new Set());

  const sendOptimizedMessage = useCallback(async (
    chatId: string,
    senderId: string,
    text: string,
    type: 'text' | 'image' | 'audio' = 'text',
    tempId?: string
  ) => {
    const messageId = tempId || `temp_${Date.now()}_${Math.random()}`;
    
    try {
      setSendingMessages(prev => new Set(prev).add(messageId));
      setFailedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });

      await sendMessage({
        chatId,
        senderId,
        text,
        type
      });

      setSendingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      return { success: true, messageId };
    } catch (error) {
      setSendingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      setFailedMessages(prev => new Set(prev).add(messageId));
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId 
      };
    }
  }, [sendMessage]);

  const retryMessage = useCallback((
    messageId: string,
    chatId: string,
    senderId: string,
    text: string,
    type: 'text' | 'image' | 'audio' = 'text'
  ) => {
    return sendOptimizedMessage(chatId, senderId, text, type, messageId);
  }, [sendOptimizedMessage]);

  const isMessageSending = useCallback((messageId: string) => {
    return sendingMessages.has(messageId);
  }, [sendingMessages]);

  const isMessageFailed = useCallback((messageId: string) => {
    return failedMessages.has(messageId);
  }, [failedMessages]);

  return {
    sendOptimizedMessage,
    retryMessage,
    isMessageSending,
    isMessageFailed,
    sendingMessages,
    failedMessages
  };
};

/**
 * Optimized hook for message reactions with batching
 */
export const useOptimizedReactions = () => {
  const [pendingReactions, setPendingReactions] = useState<Map<string, string>>(new Map());
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addReaction = useCallback((messageId: string, reaction: string) => {
    // Optimistically update UI
    setPendingReactions(prev => new Map(prev).set(messageId, reaction));

    // Clear existing timeout
    if (reactionTimeoutRef.current) {
      clearTimeout(reactionTimeoutRef.current);
    }

    // Batch reactions to reduce API calls
    reactionTimeoutRef.current = setTimeout(async () => {
      const reactionsToSend = new Map(pendingReactions);
      setPendingReactions(new Map());

      // Send batched reactions to server
      try {
        for (const [msgId, react] of reactionsToSend) {
          // await reactionService.addReaction(msgId, react);
          if (__DEV__) {
            console.log(`Added reaction ${react} to message ${msgId}`);
          }
        }
      } catch (error) {
        console.error('Failed to send reactions:', error);
        // Revert optimistic updates on failure
        setPendingReactions(prev => {
          const newMap = new Map(prev);
          for (const [msgId, react] of reactionsToSend) {
            newMap.set(msgId, react);
          }
          return newMap;
        })
      }
    }, 500);
  }, [pendingReactions]);

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current);
      }
    };
  }, []);

  return {
    addReaction,
    pendingReactions
  };
};

/**
 * Optimized hook for search functionality with debouncing
 */
export const useOptimizedSearch = (messages: Message[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search to prevent excessive filtering
  const debouncedSearch = useDebouncedCallback(
    (query: string) => {
      setIsSearching(true);
      
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const results = messages.filter(message => 
        message.text?.toLowerCase().includes(query.toLowerCase()) ||
        message.senderId?.toLowerCase().includes(query.toLowerCase())
      );
      
      setSearchResults(results);
      setIsSearching(false);
    },
    300
  );

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  return {
    searchQuery,
    searchResults,
    isSearching,
    updateSearchQuery,
    clearSearch
  };
};