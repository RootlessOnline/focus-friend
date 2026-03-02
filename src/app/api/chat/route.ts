import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildSystemPrompt } from '@/lib/ai/prompts/system-prompt';
import { buildAIContext } from '@/lib/ai/context-builder';
import { parseActions, executeActions } from '@/lib/ai/prompts/actions';

const DEMO_USER_ID = 'demo-user';

// AI Provider configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/chat';
const AI_PROVIDER = process.env.AI_PROVIDER || 'groq'; // 'groq', 'ollama', or 'fallback'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build context for AI
    const context = await buildAIContext(DEMO_USER_ID);
    const systemPrompt = buildSystemPrompt(context);

    // Build messages array for AI
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m: ChatMessage) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    let assistantResponse: string;

    // Try AI providers in order: Ollama (local) -> Groq (cloud) -> Fallback
    if (AI_PROVIDER === 'ollama') {
      assistantResponse = await getOllamaResponse(messages);
    } else if (AI_PROVIDER === 'groq' && GROQ_API_KEY) {
      assistantResponse = await getGroqResponse(messages);
    } else if (AI_PROVIDER === 'groq' && !GROQ_API_KEY) {
      // Try Ollama as fallback before rule-based
      try {
        assistantResponse = await getOllamaResponse(messages);
      } catch {
        assistantResponse = generateFallbackResponse(message, context);
      }
    } else {
      assistantResponse = generateFallbackResponse(message, context);
    }

    // Parse and execute any actions in the response
    const actions = parseActions(assistantResponse);
    const executedActions = await executeActions(actions, DEMO_USER_ID);

    // Save chat messages to database
    try {
      await db.chatMessage.createMany({
        data: [
          {
            userId: DEMO_USER_ID,
            role: 'user',
            content: message,
            contextType: detectContextType(message),
          },
          {
            userId: DEMO_USER_ID,
            role: 'assistant',
            content: assistantResponse,
            actionsTaken: executedActions.length > 0 ? JSON.stringify(executedActions) : null,
          },
        ],
      });
    } catch (dbError) {
      console.error('Failed to save chat messages:', dbError);
    }

    // Remove action blocks from visible response - use multiple patterns to be safe
    let visibleResponse = assistantResponse
      .replace(/```action\s*\n[\s\S]*?```/g, '')  // Standard format
      .replace(/```\s*action[\s\S]*?```/g, '')     // Loose whitespace
      .replace(/```action:[\s\S]*?```/g, '')       // With colon
      .trim();
    
    // Clean up extra blank lines
    visibleResponse = visibleResponse.replace(/\n{3,}/g, '\n\n').trim();

    return NextResponse.json({
      response: visibleResponse,
      actions: executedActions,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat', details: String(error) },
      { status: 500 }
    );
  }
}

// Groq API (FREE cloud AI)
async function getGroqResponse(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Groq API error:', errorData);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ||
    "I'm here to help! Could you tell me more about what you need? :3";
}

// Ollama API (FREE local AI - UNLIMITED!)
async function getOllamaResponse(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(OLLAMA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content ||
    "I'm here to help! Could you tell me more about what you need? :3";
}

function detectContextType(message: string): string {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('task') || lowerMessage.includes('todo') || lowerMessage.includes('do')) {
    return 'task';
  }
  if (lowerMessage.includes('event') || lowerMessage.includes('calendar') || lowerMessage.includes('schedule') || lowerMessage.includes('appointment')) {
    return 'event';
  }
  if (lowerMessage.includes('money') || lowerMessage.includes('balance') || lowerMessage.includes('expense') || lowerMessage.includes('income') || lowerMessage.includes('buy') || lowerMessage.includes('cost')) {
    return 'finance';
  }
  if (lowerMessage.includes('goal') || lowerMessage.includes('target') || lowerMessage.includes('achieve')) {
    return 'goal';
  }
  if (lowerMessage.includes('person') || lowerMessage.includes('friend') || lowerMessage.includes('family') || lowerMessage.includes('meet')) {
    return 'person';
  }
  return 'general';
}

// Fallback response generator with ACTUAL task creation
function generateFallbackResponse(message: string, context: any): string {
  const lowerMessage = message.toLowerCase();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Check for calendar/event keywords FIRST
  const calendarKeywords = ['calendar', 'schedule', 'event', 'appointment', 'meeting', 'call', 'meet'];
  const isCalendarRequest = calendarKeywords.some(kw => lowerMessage.includes(kw)) && 
                            (lowerMessage.includes('add to') || lowerMessage.includes('put on') || lowerMessage.includes('schedule') || lowerMessage.includes('tomorrow') || lowerMessage.includes('today'));

  // Event creation patterns - check these FIRST
  if (isCalendarRequest || lowerMessage.includes('add to calendar') || lowerMessage.includes('put on calendar')) {
    // Extract event title
    let eventTitle = message;
    
    // Remove common prefixes
    eventTitle = eventTitle.replace(/add to calendar\s*(to\s*)?/i, '');
    eventTitle = eventTitle.replace(/put on (my\s*)?calendar\s*(to\s*)?/i, '');
    eventTitle = eventTitle.replace(/schedule\s*(a\s*)?/i, '');
    eventTitle = eventTitle.replace(/add\s*(an?\s*)?event\s*/i, '');
    eventTitle = eventTitle.trim();

    // Determine time preference
    let preferredTime = 'any';
    if (lowerMessage.includes('morning')) preferredTime = 'morning';
    else if (lowerMessage.includes('afternoon')) preferredTime = 'midday';
    else if (lowerMessage.includes('evening')) preferredTime = 'evening';

    return `Got it! I've added **"${eventTitle}"** to your calendar for tomorrow! 📅 Check the Calendar view to see it. :3

\`\`\`action
CREATE_EVENT: {
  "title": "${eventTitle}",
  "startDate": "tomorrow",
  "preferredTime": "${preferredTime}"
}
\`\`\``;
  }

  // Task creation patterns
  const taskPatterns = [
    /add\s+(?:a\s+)?task\s+(?:for\s+)?(.+?)(?:\s+tomorrow|\s+today|$)/i,
    /add\s+(?:a\s+)?task\s+(.+)/i,
    /create\s+(?:a\s+)?task\s+(?:for\s+)?(.+?)(?:\s+tomorrow|\s+today|$)/i,
    /new\s+task[:\s]+(.+)/i,
    /i\s+need\s+to\s+(.+)/i,
    /remind\s+me\s+to\s+(.+)/i,
    /(?:task|todo):\s*(.+)/i,
  ];

  // Check for task creation
  for (const pattern of taskPatterns) {
    const match = message.match(pattern);
    if (match) {
      const taskTitle = match[1].trim();
      // Return action block that will be parsed and executed
      return `Got it! I've added **"${taskTitle}"** to your tasks! Check the Tasks view! ^_^

\`\`\`action
CREATE_TASK: {
  "title": "${taskTitle}",
  "dueDate": "${tomorrowStr}",
  "priority": 3
}
\`\`\``;
    }
  }

  // Financial queries
  if (lowerMessage.includes('balance') || lowerMessage.includes('money') || lowerMessage.includes('finance')) {
    const balance = context?.finances?.balance || 0;
    return `Let me check~ :3\n\nYour current balance is **$${balance.toFixed(2)}**.\n\nWant me to help track an expense or income?`;
  }

  // Goals
  if (lowerMessage.includes('goal') || lowerMessage.includes('want to')) {
    const goalMatch = message.match(/(?:goal|i want to)\s+(.+)/i);
    if (goalMatch) {
      const goalTitle = goalMatch[1].trim();
      return `That's a great goal! 🎯 I've created **"${goalTitle}"** for you! Check the Goals view! ^_^

\`\`\`action
CREATE_GOAL: {
  "title": "${goalTitle}",
  "targetValue": 10,
  "unit": "steps"
}
\`\`\``;
    }
  }

  // Greeting
  if (lowerMessage.match(/^(hi|hello|hey|howdy|sup)/)) {
    const taskCount = context?.overdueTasks?.length || 0;
    const eventCount = context?.upcomingEvents?.length || 0;
    return `Hey there! :3 Good to see you!\n\nYou have ${taskCount} tasks and ${eventCount} upcoming events. What would you like to work on today? ^_^`;
  }

  // Help
  if (lowerMessage.includes('help')) {
    return `I'm here to help! :3 Here's what I can do:\n\n**Tasks:** "add a task to buy groceries"\n**Events:** "add to calendar call mom tomorrow"\n**Finances:** "what's my balance?"\n**Goals:** "create a goal to exercise more"\n\nWhat would you like to do? ^_^`;
  }

  // Default
  return `Hmm, I'm not sure what you mean! :3\n\nTry:\n- "add to calendar [event]"\n- "add a task [what to do]"\n- "what's my balance?"\n\nI'll figure it out! ^_^`;
}
