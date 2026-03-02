'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Send,
  User,
  Bot,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  CheckSquare,
  Wallet,
  Target,
  Users,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
}

interface AIAction {
  action?: string;  // API returns 'action'
  type?: string;    // Or sometimes 'type'
  success: boolean;
  message?: string;
}

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatView({ messages, onSendMessage, isLoading }: ChatViewProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getActionIcon = (type: string | undefined) => {
    if (!type) return CheckCircle;
    const upperType = type.toUpperCase();
    if (upperType.includes('EVENT') || upperType.includes('CALENDAR')) return Calendar;
    if (upperType.includes('TASK')) return CheckSquare;
    if (upperType.includes('TRANSACTION') || upperType.includes('BALANCE')) return Wallet;
    if (upperType.includes('GOAL')) return Target;
    if (upperType.includes('PERSON')) return Users;
    return CheckCircle;
  };

  // Get action type from either 'action' or 'type' property
  const getActionType = (a: AIAction): string => a.action || a.type || 'UNKNOWN';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="w-8 h-8 text-neon-pink" />
            <div className="absolute inset-0 blur-md bg-neon-pink/30 rounded-full" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text-dva">Focus Friend AI</h1>
            <p className="text-sm text-muted-foreground">Your ADHD companion :3</p>
          </div>
        </div>
        <Badge variant="outline" className="border-neon-green text-neon-green">
          Online
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 lg:p-6" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="relative inline-block mb-4">
                <Sparkles className="w-16 h-16 text-neon-pink mx-auto" />
                <div className="absolute inset-0 blur-xl bg-neon-pink/30 rounded-full" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                <span className="gradient-text-dva">Hey there, friend!</span> :3
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                I'm your ADHD assistant! I can help you with:
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {[
                  { icon: CheckSquare, text: 'Create & manage tasks', color: 'text-neon-pink' },
                  { icon: Calendar, text: 'Schedule events', color: 'text-neon-purple' },
                  { icon: Wallet, text: 'Track finances', color: 'text-neon-green' },
                  { icon: Target, text: 'Set goals', color: 'text-neon-yellow' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-card)] text-sm">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                Try saying: "Add a task to buy groceries tomorrow" or "What's my balance?"
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar className={`w-8 h-8 ${message.role === 'user' ? 'bg-neon-purple' : 'bg-neon-pink'}`}>
                <AvatarFallback className="bg-transparent">
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`inline-block p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-tr-none'
                      : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {/* Actions taken */}
                {message.actions && message.actions.length > 0 && (
                  <div className={`mt-2 flex flex-wrap gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.actions.filter(a => a && (a.action || a.type)).map((action, i) => {
                      const actionType = getActionType(action);
                      const Icon = getActionIcon(actionType);
                      return (
                        <Badge
                          key={i}
                          variant="outline"
                          className={`text-xs ${
                            action.success
                              ? 'border-neon-green text-neon-green'
                              : 'border-destructive text-destructive'
                          }`}
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          {actionType.replace(/_/g, ' ')}
                          {action.success ? (
                            <CheckCircle className="w-3 h-3 ml-1" />
                          ) : (
                            <AlertCircle className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 bg-neon-pink">
                <AvatarFallback className="bg-transparent">
                  <Bot className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl rounded-tl-none p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-neon-pink" />
                  <span className="text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 lg:p-6 border-t border-[var(--border-subtle)]">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... :3"
              className="flex-1 bg-[var(--bg-card)] border-[var(--border-default)] focus:border-neon-pink focus:ring-neon-pink/20"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="btn-neon-primary"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            I can create tasks, events, track finances, and help you stay organized!
          </p>
        </div>
      </div>
    </div>
  );
}
