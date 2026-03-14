import { useState } from 'react';
import { useListOpenaiConversations, useCreateOpenaiConversation, getListOpenaiConversationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function useChatStream(conversationId?: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (content: string) => {
    if (!conversationId) return;
    
    // Optimistic user message
    setMessages(prev => [...prev, { role: 'user', content }]);
    // Placeholder for assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    try {
      const res = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              
              if (data.content) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content += data.content;
                  return newMessages;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE chunk:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = "[SYSTEM ERROR: CONNECTION LOST]";
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const loadHistory = async () => {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/openai/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  return { messages, sendMessage, isStreaming, loadHistory };
}

export function useConversations() {
  const queryClient = useQueryClient();
  const listQuery = useListOpenaiConversations();
  const createMutation = useCreateOpenaiConversation({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() })
    }
  });

  return {
    conversations: listQuery.data || [],
    isLoading: listQuery.isLoading,
    createConversation: async (title: string) => {
      return createMutation.mutateAsync({ data: { title } });
    }
  };
}
