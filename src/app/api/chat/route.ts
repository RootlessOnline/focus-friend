import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildSystemPrompt } from '@/lib/ai/prompts/system-prompt';
import { buildAIContext } from '@/lib/ai/context-builder';
import { parseActions, executeActions } from '@/lib/ai/prompts/actions';

const DEMO_USER_ID = 'demo-user';

// Groq API configuration (FREE!)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

    // Check if Groq API key is configured
    if (GROQ_API_KEY) {
      // Use Groq API (FREE and fast!)
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', // Free, powerful model
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
      assistantResponse = data.choices[0]?.message?.content ||
        "I'm here to help! Could you tell me more about what you need? :3";
    } else {
      // Fallback: Simple rule-based responses when no API key
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
      // Continue even if DB save fails
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

// Fallback response generator when no AI API is configured
function generateFallbackResponse(message: string, context: any): string {
  const lowerMessage = message.toLowerCase();

  // Task creation
  if (lowerMessage.includes('add') && (lowerMessage.includes('task') || lowerMessage.includes('todo'))) {
    const taskMatch = message.match(/add\s+(?:a\s+)?task\s+(?:for\s+)?(.+?)(?:\s+for\s+|\s+by\s+|$)/i);
    const taskTitle = taskMatch ? taskMatch[1] : message.replace(/add\s+(?:a\s+)?task\s+/i, '').trim();

    return `Got it! Let me add that task for you~ :3

\`\`\`action
CREATE_TASK: {
  title: "${taskTitle}",
  dueDate: "tomorrow",
  priority: 3
}
\`\`\`

I've added "${taskTitle}" to your tasks! Want to set a specific time or priority? ^_^`;
  }

  // Event creation
  if (lowerMessage.includes('schedule') || lowerMessage.includes('event') || lowerMessage.includes('appointment')) {
    return `Ooh, let's get that on your calendar! :3

\`\`\`action
CREATE_EVENT: {
  title: "${message.replace(/schedule|event|appointment/gi, '').trim()}",
  startDate: "tomorrow",
  preferredTime: "any"
}
\`\`\`

Event created! Want to add more details like time or location? ^_^`;
  }

  // Financial queries
  if (lowerMessage.includes('balance') || lowerMessage.includes('money') || lowerMessage.includes('finance')) {
    const balance = context?.finances?.balance || 0;
    return `Let me check your finances~ :3\n\nYour current balance is **$${balance.toFixed(2)}**.\n\nWant me to help you track an expense or income?`;
  }

  // Greeting
  if (lowerMessage.match(/^(hi|hello|hey|howdy|sup)/)) {
    const taskCount = context?.overdueTasks?.length || 0;
    const eventCount = context?.upcomingEvents?.length || 0;

    return `Hey there! :3 Good to see you!\n\nYou have ${taskCount} tasks and ${eventCount} upcoming events. What would you like to work on today? ^_^`;
  }

  // Help
  if (lowerMessage.includes('help')) {
    return `I'm here to help you stay organized! :3 Here's what I can do:\n\n**Tasks:** "add a task to buy groceries"\n**Events:** "schedule a meeting tomorrow at 3pm"\n**Finances:** "what's my balance?"\n**Goals:** "create a goal to exercise more"\n\nWhat would you like to do? ^_^`;
  }

  // Default response
  return `I'm here to help! :3 Could you tell me more about what you need?\n\nYou can ask me to:\n- Add tasks: "add a task for tomorrow"\n- Schedule events: "schedule a meeting on Friday"\n- Check finances: "what's my balance?"\n- Create goals: "I want to learn coding"\n\nWhat's on your mind? ^_^`;
}
