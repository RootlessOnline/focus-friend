/**
 * AI Context Builder
 * 
 * Builds rich context for AI conversations by gathering relevant data
 */

import { db } from '../db';
import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

export interface AIContext {
  user: {
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    pronouns: string | null;
    morningStart: number;
    middayStart: number;
    eveningStart: number;
    timezone: string;
    currency: string;
  } | null;
  
  upcomingEvents: Array<{
    id: string;
    title: string;
    startDate: Date;
    endDate: Date | null;
    preferredTime: string | null;
    status: string;
  }>;
  
  overdueTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: number;
    dueDate: Date | null;
    goalId: string | null;
  }>;
  
  activeGoals: Array<{
    id: string;
    title: string;
    targetValue: number | null;
    currentValue: number;
    unit: string | null;
    targetDate: Date | null;
    tasks: Array<{ id: string; title: string; status: string }>;
  }>;
  
  recentTransactions: Array<{
    id: string;
    amount: number;
    description: string;
    category: string;
    date: Date;
  }>;
  
  finances: {
    balance: number;
    pendingIncome: number;
    pendingExpenses: number;
    projectedBalance: number;
    warnings: string[];
  };
  
  people: Array<{
    id: string;
    name: string;
    nickname: string | null;
    relationship: string | null;
    lastContactDate: Date | null;
  }>;
  
  currentTime: Date;
}

// ============================================================================
// MAIN CONTEXT BUILDER
// ============================================================================

export async function buildAIContext(userId: string): Promise<AIContext> {
  const now = new Date();
  const weekFromNow = addDays(now, 7);
  const thirtyDaysAgo = addDays(now, -30);
  
  // Run all queries in parallel for performance
  const [
    user,
    upcomingEvents,
    overdueTasks,
    doingTasks,
    activeGoals,
    recentTransactions,
    pendingIncome,
    pendingExpenses,
    debts,
    people,
  ] = await Promise.all([
    // User info
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        displayName: true,
        pronouns: true,
        morningStart: true,
        middayStart: true,
        eveningStart: true,
        timezone: true,
        currency: true,
      },
    }),
    
    // Upcoming events (next 7 days)
    db.event.findMany({
      where: {
        userId,
        startDate: { gte: now, lte: weekFromNow },
        status: 'confirmed',
      },
      orderBy: { startDate: 'asc' },
      take: 10,
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        preferredTime: true,
        status: true,
      },
    }),
    
    // Overdue tasks
    db.task.findMany({
      where: {
        userId,
        dueDate: { lt: now },
        status: { notIn: ['done', 'archived'] },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        goalId: true,
      },
    }),
    
    // Tasks currently in progress
    db.task.findMany({
      where: {
        userId,
        status: 'doing',
      },
      orderBy: { priority: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        goalId: true,
      },
    }),
    
    // Active goals with their tasks
    db.goal.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        tasks: {
          select: { id: true, title: true, status: true },
          take: 5,
        },
      },
    }),
    
    // Recent transactions
    db.transaction.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        description: true,
        category: true,
        date: true,
      },
    }),
    
    // Pending income (expected but not received)
    db.transaction.aggregate({
      where: {
        userId,
        amount: { gt: 0 },
        date: { gte: now },
      },
      _sum: { amount: true },
    }),
    
    // Pending expenses (expected)
    db.transaction.aggregate({
      where: {
        userId,
        amount: { lt: 0 },
        date: { gte: now },
      },
      _sum: { amount: true },
    }),
    
    // Active debts
    db.debt.findMany({
      where: {
        userId,
        status: 'active',
      },
      orderBy: { dueDate: 'asc' },
    }),
    
    // People recently interacted with
    db.person.findMany({
      where: { userId },
      orderBy: { lastContactDate: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        nickname: true,
        relationship: true,
        lastContactDate: true,
      },
    }),
  ]);
  
  // Calculate finances
  const balanceResult = await calculateBalance(userId);
  const finances = {
    balance: balanceResult,
    pendingIncome: pendingIncome._sum.amount || 0,
    pendingExpenses: Math.abs(pendingExpenses._sum.amount || 0),
    projectedBalance: balanceResult + (pendingIncome._sum.amount || 0) - Math.abs(pendingExpenses._sum.amount || 0),
    warnings: generateFinanceWarnings(balanceResult, debts),
  };
  
  // Combine overdue and doing tasks
  const allTasks = [...overdueTasks, ...doingTasks];
  
  return {
    user,
    upcomingEvents,
    overdueTasks: allTasks,
    activeGoals,
    recentTransactions,
    finances,
    people,
    currentTime: now,
  };
}

// ============================================================================
// FINANCE HELPERS
// ============================================================================

async function calculateBalance(userId: string): Promise<number> {
  const result = await db.transaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  
  return result._sum.amount || 0;
}

function generateFinanceWarnings(
  balance: number, 
  debts: Array<{ currentAmount: number; dueDate: Date | null; name: string }>
): string[] {
  const warnings: string[] = [];
  
  if (balance < 0) {
    warnings.push('Balance is negative!');
  }
  
  if (balance < 50) {
    warnings.push('Balance is very low');
  }
  
  // Check for upcoming debt due dates
  const now = new Date();
  const threeDays = addDays(now, 3);
  
  for (const debt of debts) {
    if (debt.dueDate && debt.dueDate <= threeDays && debt.dueDate >= now) {
      warnings.push(`Debt "${debt.name}" due soon`);
    }
  }
  
  return warnings;
}

// ============================================================================
// CONTEXT FOR SPECIFIC ENTITIES
// ============================================================================

export async function buildEntityContext(
  entityType: 'task' | 'event' | 'goal' | 'person' | 'transaction',
  entityId: string,
  userId: string
): Promise<Record<string, any>> {
  switch (entityType) {
    case 'task':
      return buildTaskContext(entityId, userId);
    case 'event':
      return buildEventContext(entityId, userId);
    case 'goal':
      return buildGoalContext(entityId, userId);
    case 'person':
      return buildPersonContext(entityId, userId);
    case 'transaction':
      return buildTransactionContext(entityId, userId);
    default:
      return {};
  }
}

async function buildTaskContext(taskId: string, userId: string): Promise<Record<string, any>> {
  const task = await db.task.findFirst({
    where: { id: taskId, userId },
    include: {
      goal: true,
      event: true,
      transactions: true,
      tags: { include: { tag: true } },
      dependsOn: { include: { dependsOnTask: true } },
      dependedBy: { include: { task: true } },
    },
  });
  
  if (!task) return {};
  
  return {
    task,
    linkedGoal: task.goal,
    linkedEvent: task.event,
    transactions: task.transactions,
    tags: task.tags.map(t => t.tag),
    dependencies: {
      dependsOn: task.dependsOn.map(d => d.dependsOnTask),
      blockedBy: task.dependedBy.map(d => d.task),
    },
  };
}

async function buildEventContext(eventId: string, userId: string): Promise<Record<string, any>> {
  const event = await db.event.findFirst({
    where: { id: eventId, userId },
    include: {
      tasks: true,
      transactions: true,
      people: { include: { person: true } },
      tags: { include: { tag: true } },
    },
  });
  
  if (!event) return {};
  
  return {
    event,
    linkedTasks: event.tasks,
    transactions: event.transactions,
    attendees: event.people.map(p => p.person),
    tags: event.tags.map(t => t.tag),
  };
}

async function buildGoalContext(goalId: string, userId: string): Promise<Record<string, any>> {
  const goal = await db.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      tasks: true,
      tags: { include: { tag: true } },
    },
  });
  
  if (!goal) return {};
  
  const completedTasks = goal.tasks.filter(t => t.status === 'done').length;
  const totalTasks = goal.tasks.length;
  
  return {
    goal,
    tasks: goal.tasks,
    tags: goal.tags.map(t => t.tag),
    progress: {
      completedTasks,
      totalTasks,
      percentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    },
  };
}

async function buildPersonContext(personId: string, userId: string): Promise<Record<string, any>> {
  const person = await db.person.findFirst({
    where: { id: personId, userId },
    include: {
      events: {
        include: { event: true },
        orderBy: { event: { startDate: 'desc' } },
      },
    },
  });
  
  if (!person) return {};
  
  return {
    person,
    eventHistory: person.events.map(e => e.event),
    upcomingEvents: person.events
      .filter(e => new Date(e.event.startDate) >= new Date())
      .map(e => e.event),
  };
}

async function buildTransactionContext(transactionId: string, userId: string): Promise<Record<string, any>> {
  const transaction = await db.transaction.findFirst({
    where: { id: transactionId, userId },
    include: {
      event: true,
      task: true,
      debt: true,
    },
  });
  
  if (!transaction) return {};
  
  return {
    transaction,
    linkedEvent: transaction.event,
    linkedTask: transaction.task,
    linkedDebt: transaction.debt,
  };
}

// ============================================================================
// SMART SCHEDULING CONTEXT
// ============================================================================

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  preference: 'morning' | 'midday' | 'evening';
}

export async function getAvailableTimeSlots(
  userId: string,
  date: Date,
  duration: number,
  preferredTime?: 'morning' | 'midday' | 'evening' | 'any'
): Promise<TimeSlot[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { morningStart: true, middayStart: true, eveningStart: true },
  });
  
  if (!user) return [];
  
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  // Get existing events for the day
  const existingEvents = await db.event.findMany({
    where: {
      userId,
      startDate: { gte: dayStart, lte: dayEnd },
      status: 'confirmed',
    },
    orderBy: { startDate: 'asc' },
  });
  
  // Generate time slots
  const slots: TimeSlot[] = [];
  
  // Morning slots
  for (let hour = user.morningStart; hour < user.middayStart; hour++) {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);
    
    const available = !existingEvents.some(e => 
      (new Date(e.startDate) < slotEnd && new Date(e.endDate || e.startDate) > slotStart)
    );
    
    slots.push({
      start: slotStart,
      end: slotEnd,
      available,
      preference: 'morning',
    });
  }
  
  // Midday slots
  for (let hour = user.middayStart; hour < user.eveningStart; hour++) {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);
    
    const available = !existingEvents.some(e => 
      (new Date(e.startDate) < slotEnd && new Date(e.endDate || e.startDate) > slotStart)
    );
    
    slots.push({
      start: slotStart,
      end: slotEnd,
      available,
      preference: 'midday',
    });
  }
  
  // Evening slots
  for (let hour = user.eveningStart; hour < 22; hour++) {
    const slotStart = new Date(date);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(date);
    slotEnd.setHours(hour + 1, 0, 0, 0);
    
    const available = !existingEvents.some(e => 
      (new Date(e.startDate) < slotEnd && new Date(e.endDate || e.startDate) > slotStart)
    );
    
    slots.push({
      start: slotStart,
      end: slotEnd,
      available,
      preference: 'evening',
    });
  }
  
  // Filter by preference if specified
  if (preferredTime && preferredTime !== 'any') {
    return slots.filter(s => s.preference === preferredTime && s.available);
  }
  
  return slots.filter(s => s.available);
}
