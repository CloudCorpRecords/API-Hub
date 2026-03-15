import { useState } from 'react';
import { useListOpenaiConversations, useCreateOpenaiConversation, getListOpenaiConversationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'tool_status';
  content: string;
  toolName?: string;
};

export function useChatStream(conversationId?: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (content: string) => {
    if (!conversationId) return;
    
    setMessages(prev => [...prev, { role: 'user', content }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setIsStreaming(true);

    try {
      const res = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (res.status === 401) {
        const returnTo = encodeURIComponent(window.location.pathname);
        window.location.href = `/api/login?returnTo=${returnTo}`;
        return;
      }
      if (res.status === 403) {
        throw new Error('You don\'t have permission to perform this action.');
      }
      if (res.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (!res.ok) throw new Error('Failed to send message');
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let sseBuffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n\n');
        sseBuffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              
              if (data.tool_status) {
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'tool_status' && last.content === data.tool_status) {
                    return prev;
                  }
                  const withoutEmptyAssistant = last && last.role === 'assistant' && last.content === ''
                    ? prev.slice(0, -1)
                    : prev;
                  return [
                    ...withoutEmptyAssistant,
                    { role: 'tool_status', content: data.tool_status, toolName: data.tool_name },
                  ];
                });
                continue;
              }
              
              if (data.content) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMsg = newMessages[newMessages.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content += data.content;
                  } else {
                    newMessages.push({ role: 'assistant', content: data.content });
                  }
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
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = "[SYSTEM ERROR: CONNECTION LOST]";
        } else {
          newMessages.push({ role: 'assistant', content: "[SYSTEM ERROR: CONNECTION LOST]" });
        }
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
