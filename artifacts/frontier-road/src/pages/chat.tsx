import { useEffect, useRef, useState } from 'react';
import { useChatStream, useConversations } from '@/hooks/use-chat';
import { CyberCard } from '@/components/CyberCard';
import { CyberButton } from '@/components/CyberButton';
import { Send, Terminal, Bot } from 'lucide-react';
import { format } from 'date-fns';

export default function Chat() {
  const { conversations, createConversation, isLoading: convsLoading } = useConversations();
  const [activeId, setActiveId] = useState<number | null>(null);
  const { messages, sendMessage, isStreaming, loadHistory } = useChatStream(activeId || undefined);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-select first conversation or create one
  useEffect(() => {
    if (!convsLoading && conversations.length > 0 && !activeId) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, convsLoading, activeId]);

  useEffect(() => {
    if (activeId) {
      loadHistory();
    }
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = async () => {
    const conv = await createConversation(`Session_${Math.floor(Math.random()*1000)}`);
    setActiveId(conv.id);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !activeId) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      
      {/* Sidebar - Chat History */}
      <div className="w-full md:w-64 flex flex-col gap-4 h-full shrink-0">
        <CyberButton onClick={handleNewChat} variant="secondary" className="w-full justify-start text-xs py-3">
          + INIT_NEW_SESSION
        </CyberButton>
        
        <CyberCard className="flex-1 p-0 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border bg-background/50 font-display text-sm tracking-widest text-muted-foreground uppercase">
            Commlinks
          </div>
          <div className="flex-1 overflow-y-auto cyber-scrollbar p-2 space-y-1">
            {convsLoading ? (
              <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Scanning...</div>
            ) : conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-3 py-2 text-xs font-sans transition-all ${
                  activeId === c.id 
                    ? 'bg-primary/20 text-primary border-l-2 border-primary' 
                    : 'text-muted-foreground hover:bg-white/5'
                }`}
              >
                <div className="truncate">{c.title}</div>
                <div className="text-[9px] opacity-50 mt-1">{format(new Date(c.createdAt), 'MM/dd HH:mm')}</div>
              </button>
            ))}
          </div>
        </CyberCard>
      </div>

      {/* Main Chat Area */}
      <CyberCard className="flex-1 p-0 flex flex-col overflow-hidden border-primary/30 relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none blur-3xl group-hover:bg-primary/10 transition-all duration-1000" />
        
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center gap-3 bg-background/80 backdrop-blur-md relative z-10">
          <div className="w-10 h-10 rounded-none bg-primary/20 border border-primary flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-primary tracking-widest leading-none">TOWER_AI</h2>
            <div className="text-xs font-sans text-muted-foreground flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              Connected to OS Matrix
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 cyber-scrollbar relative z-10">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 opacity-50">
              <Terminal className="w-12 h-12 mb-4" />
              <p className="font-display uppercase tracking-widest text-sm">Awaiting Input Query</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] border p-4 ${
                msg.role === 'user' 
                  ? 'bg-primary/10 border-primary/30 text-foreground' 
                  : 'bg-card border-border text-foreground'
              }`}>
                <div className="text-[10px] uppercase font-display tracking-widest mb-2 opacity-50 flex items-center gap-1">
                  {msg.role === 'user' ? 'USER_INPUT' : 'SYS_RESPONSE'}
                </div>
                <div className="font-sans text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content || (isStreaming && i === messages.length - 1 ? <span className="animate-pulse">_</span> : '')}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border relative z-10">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Query TowerOS..."
              className="flex-1 bg-card border border-border px-4 py-3 text-sm font-sans focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-foreground"
              disabled={!activeId || isStreaming}
            />
            <CyberButton 
              type="submit" 
              disabled={!input.trim() || !activeId || isStreaming}
              className="px-6"
            >
              <Send className="w-4 h-4" />
            </CyberButton>
          </form>
        </div>
      </CyberCard>
    </div>
  );
}
