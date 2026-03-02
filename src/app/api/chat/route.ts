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

    // Remove action blocks from visible response
    const visibleResponse = assistantResponse.replace(/```action[\s\S]*?```/g, '').trim();

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
      return `Got it! Let me add that task for you~ :3

\`\`\`action
CREATE_TASK: {
  "title": "${taskTitle}",
  "dueDate": "${tomorrowStr}",
  "priority": 3
}
\`\`\`

I've added **"${taskTitle}"** to your tasks! You can see it in the Tasks view. Want to set a specific priority or due date? ^_^`;
    }
  }

  // Event creation patterns
  const eventPatterns = [
    /schedule\s+(?:a\s+)?(.+?)(?:\s+for\s+|\s+on\s+|$)/i,
    /add\s+(?:an?\s+)?event\s+(.+)/i,
    /(?:meeting|appointment)\s+(.+)/i,
  ];

  for (const pattern of eventPatterns) {
    const match = message.match(pattern);
    if (match) {
      const eventTitle = match[1].trim();
      return `Ooh, let's get that on your calendar! :3

\`\`\`action
CREATE_EVENT: {
  "title": "${eventTitle}",
  "startDate": "${tomorrowStr}",
  "preferredTime": "any"
}
\`\`\`

Event **"${eventTitle}"** created! Check the Calendar view to see it. Want to add a time or location? ^_^`;
    }
  }

  // Financial queries
  if (lowerMessage.includes('balance') || lowerMessage.includes('money') || lowerMessage.includes('finance')) {
    const balance = context?.finances?.balance || 0;
    return `Let me check your finances~ :3\n\nYour current balance is **$${balance.toFixed(2)}**.\n\nWant me to help you track an expense or income?`;
  }

  // Goals
  if (lowerMessage.includes('goal') || lowerMessage.includes('want to')) {
    const goalMatch = message.match(/(?:goal|i want to)\s+(.+)/i);
    if (goalMatch) {
      const goalTitle = goalMatch[1].trim();
      return `That's a great goal! Let me add it~ :3

\`\`\`action
CREATE_GOAL: {
  "title": "${goalTitle}",
  "targetValue": 10,
  "unit": "steps"
}
\`\`\`

Goal **"${goalTitle}"** created! Check the Goals view to track your progress. ^_^`;
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
    return `I'm here to help you stay organized! :3 Here's what I can do:\n\n**Tasks:** "add a task to buy groceries" or "I need to call mom"\n**Events:** "schedule a meeting tomorrow" or "appointment dentist"\n**Finances:** "what's my balance?"\n**Goals:** "I want to learn coding"\n\nWhat would you like to do? ^_^`;
  }

  // Default - try to interpret as a task
  if (message.length > 3 && message.length < 100) {
    return `Hmm, I'm not sure what you mean, but I can help! :3\n\nTry saying:\n- "add a task [what you need to do]"\n- "schedule [event name]"\n- "what's my balance?"\n\nOr tell me what you need and I'll figure it out! ^_^`;
  }

  return `I'm here to help! :3 Could you tell me more about what you need?\n\nYou can ask me to:\n- Add tasks: "add a task for tomorrow"\n- Schedule events: "schedule a meeting on Friday"\n- Check finances: "what's my balance?"\n- Create goals: "I want to learn coding"\n\nWhat's on your mind? ^_^`;
}
