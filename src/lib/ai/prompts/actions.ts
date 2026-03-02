/**
 * AI Action Definitions
 * 
 * Type definitions and handlers for all AI-initiated actions
 */

// ============================================================================
// ACTION TYPES
// ============================================================================

export type ActionType = 
  // Events
  | 'CREATE_EVENT'
  | 'UPDATE_EVENT'
  | 'DELETE_EVENT'
  | 'SCHEDULE_EVENT'
  // Tasks
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'MOVE_TASK'
  | 'SUGGEST_PRIORITY'
  // Goals
  | 'CREATE_GOAL'
  | 'UPDATE_GOAL'
  | 'ADD_TASK_TO_GOAL'
  // Finance
  | 'SET_BALANCE'
  | 'ADD_TRANSACTION'
  | 'CREATE_DEBT'
  | 'CHECK_PREDICTION'
  // People
  | 'CREATE_PERSON'
  | 'LINK_PERSON'
  // Queries
  | 'GET_UPCOMING'
  | 'GET_FINANCES'
  | 'GET_PEOPLE'
  | 'SEARCH';

// ============================================================================
// ACTION INTERFACES
// ============================================================================

export interface AIAction {
  type: ActionType;
  params: Record<string, any>;
}

// Event Actions
export interface CreateEventParams {
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
  preferredTime?: 'morning' | 'midday' | 'evening' | 'any';
  recurring?: 'daily' | 'weekly' | 'monthly' | { rule: string };
  cost?: number;
  people?: string[];
  location?: string;
  isAllDay?: boolean;
}

export interface UpdateEventParams {
  eventId: string;
  updates: Partial<CreateEventParams & {
    status: 'tentative' | 'confirmed' | 'cancelled';
    reminderMinutes: number;
  }>;
}

export interface DeleteEventParams {
  eventId: string;
  deleteRecurring?: boolean; // Also delete future occurrences
}

export interface ScheduleEventParams {
  title: string;
  duration: number; // minutes
  preferredTime: 'morning' | 'midday' | 'evening' | 'any';
  dateRange?: { start: string; end: string };
}

// Task Actions
export interface CreateTaskParams {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  goalId?: string;
  eventId?: string;
  cost?: number;
  dependsOn?: string[];
  estimatedMinutes?: number;
  subtasks?: Array<{ title: string; done?: boolean }>;
}

export interface UpdateTaskParams {
  taskId: string;
  updates: Partial<CreateTaskParams & {
    status: 'backlog' | 'doing' | 'done' | 'archived';
    actualMinutes: number;
  }>;
}

export interface MoveTaskParams {
  taskId: string;
  status: 'backlog' | 'doing' | 'done';
}

export interface SuggestPriorityParams {
  taskId: string;
  suggestedPriority: 1 | 2 | 3 | 4 | 5;
  reason: string;
}

// Goal Actions
export interface CreateGoalParams {
  title: string;
  description?: string;
  targetDate?: string;
  targetValue?: number;
  unit?: string;
}

export interface UpdateGoalParams {
  goalId: string;
  updates: Partial<CreateGoalParams & {
    status: 'active' | 'completed' | 'paused' | 'abandoned';
    currentValue: number;
  }>;
}

export interface AddTaskToGoalParams {
  taskId: string;
  goalId: string;
}

// Finance Actions
export interface SetBalanceParams {
  amount: number;
  note?: string;
}

export interface AddTransactionParams {
  amount: number;
  description: string;
  category?: string;
  date?: string;
  eventId?: string;
  taskId?: string;
  debtId?: string;
  recurring?: 'daily' | 'weekly' | 'monthly';
}

export interface CreateDebtParams {
  name: string;
  amount: number;
  isOwed: boolean;
  dueDate?: string;
  person?: string;
  notes?: string;
  interestRate?: number;
}

export interface CheckPredictionParams {
  targetDate: string;
  targetAmount?: number;
}

// People Actions
export interface CreatePersonParams {
  name: string;
  nickname?: string;
  relationship?: string;
  notes?: string;
  email?: string;
  phone?: string;
  importantDates?: Array<{ type: string; date: string }>;
}

export interface LinkPersonParams {
  personId: string;
  eventId: string;
  role?: string;
}

// Query Actions
export interface GetUpcomingParams {
  type: 'events' | 'tasks' | 'all';
  days?: number;
  includeOverdue?: boolean;
}

export interface GetFinancesParams {
  includePredictions?: boolean;
  includeDebts?: boolean;
}

export interface GetPeopleParams {
  upcomingDates?: boolean;
  recent?: boolean;
}

export interface SearchParams {
  query: string;
  entityType?: 'task' | 'event' | 'person' | 'goal' | 'transaction';
}

// ============================================================================
// ACTION RESULT TYPES
// ============================================================================

export interface ActionResult {
  success: boolean;
  action: ActionType;
  data?: any;
  error?: string;
  message?: string;
}

// ============================================================================
// ACTION CATEGORIES
// ============================================================================

export const ACTION_CATEGORIES = {
  events: ['CREATE_EVENT', 'UPDATE_EVENT', 'DELETE_EVENT', 'SCHEDULE_EVENT'],
  tasks: ['CREATE_TASK', 'UPDATE_TASK', 'MOVE_TASK', 'SUGGEST_PRIORITY'],
  goals: ['CREATE_GOAL', 'UPDATE_GOAL', 'ADD_TASK_TO_GOAL'],
  finance: ['SET_BALANCE', 'ADD_TRANSACTION', 'CREATE_DEBT', 'CHECK_PREDICTION'],
  people: ['CREATE_PERSON', 'LINK_PERSON'],
  queries: ['GET_UPCOMING', 'GET_FINANCES', 'GET_PEOPLE', 'SEARCH'],
} as const;

export function getActionCategory(action: ActionType): string | undefined {
  for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
    if (actions.includes(action)) return category;
  }
  return undefined;
}

// ============================================================================
// ACTION VALIDATION
// ============================================================================

export const REQUIRED_PARAMS: Record<ActionType, string[]> = {
  CREATE_EVENT: ['title', 'startDate'],
  UPDATE_EVENT: ['eventId', 'updates'],
  DELETE_EVENT: ['eventId'],
  SCHEDULE_EVENT: ['title', 'duration', 'preferredTime'],
  CREATE_TASK: ['title'],
  UPDATE_TASK: ['taskId', 'updates'],
  MOVE_TASK: ['taskId', 'status'],
  SUGGEST_PRIORITY: ['taskId', 'suggestedPriority', 'reason'],
  CREATE_GOAL: ['title'],
  UPDATE_GOAL: ['goalId', 'updates'],
  ADD_TASK_TO_GOAL: ['taskId', 'goalId'],
  SET_BALANCE: ['amount'],
  ADD_TRANSACTION: ['amount', 'description'],
  CREATE_DEBT: ['name', 'amount', 'isOwed'],
  CHECK_PREDICTION: ['targetDate'],
  CREATE_PERSON: ['name'],
  LINK_PERSON: ['personId', 'eventId'],
  GET_UPCOMING: ['type'],
  GET_FINANCES: [],
  GET_PEOPLE: [],
  SEARCH: ['query'],
};

export function validateAction(action: AIAction): { valid: boolean; missing: string[] } {
  const required = REQUIRED_PARAMS[action.type] || [];
  const missing = required.filter(param => 
    action.params[param] === undefined || action.params[param] === null
  );
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// NATURAL LANGUAGE DATE PATTERNS
// ============================================================================

export const DATE_PATTERNS = {
  relative: [
    { pattern: /^today$/i, value: () => new Date() },
    { pattern: /^tomorrow$/i, value: () => addDays(new Date(), 1) },
    { pattern: /^yesterday$/i, value: () => addDays(new Date(), -1) },
    { pattern: /^next week$/i, value: () => addDays(new Date(), 7) },
    { pattern: /^in (\d+) days?$/i, value: (match: RegExpMatchArray) => addDays(new Date(), parseInt(match[1])) },
    { pattern: /^in (\d+) weeks?$/i, value: (match: RegExpMatchArray) => addDays(new Date(), parseInt(match[1]) * 7) },
    { pattern: /^in (\d+) months?$/i, value: (match: RegExpMatchArray) => addMonths(new Date(), parseInt(match[1])) },
  ],
  days: [
    { pattern: /^this (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i, next: false },
    { pattern: /^next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i, next: true },
  ],
  timeOfDay: [
    { pattern: /\bmorning\b/i, hours: [8, 12] },
    { pattern: /\bafternoon\b/i, hours: [12, 17] },
    { pattern: /\bevening\b/i, hours: [17, 21] },
    { pattern: /\bnight\b/i, hours: [21, 24] },
  ],
};

// Helper functions
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// ============================================================================
// TRANSACTION CATEGORIES
// ============================================================================

export const TRANSACTION_CATEGORIES = [
  'income',
  'groceries',
  'bills',
  'entertainment',
  'transport',
  'health',
  'shopping',
  'subscription',
  'debt-payment',
  'restaurants',
  'education',
  'gifts',
  'savings',
  'uncategorized',
] as const;

export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];

export function inferCategory(description: string): TransactionCategory {
  const lower = description.toLowerCase();
  
  if (/\b(salary|paycheck|income|deposit|refund)\b/.test(lower)) return 'income';
  if (/\b(grocery|groceries|food|supermarket|trader joe|whole food|costco)\b/.test(lower)) return 'groceries';
  if (/\b(bill|utility|electric|water|gas|internet|phone|rent|mortgage)\b/.test(lower)) return 'bills';
  if (/\b(movie|game|concert|netflix|spotify|hulu|disney|entertainment)\b/.test(lower)) return 'entertainment';
  if (/\b(uber|lyft|gas station|transit|bus|train|parking)\b/.test(lower)) return 'transport';
  if (/\b(pharmacy|doctor|medicine|health|therapy|hospital)\b/.test(lower)) return 'health';
  if (/\b(amazon|target|walmart|store|shop|clothes|clothing)\b/.test(lower)) return 'shopping';
  if (/\b(subscription|monthly|annual|membership)\b/.test(lower)) return 'subscription';
  if (/\b(restaurant|cafe|coffee|dining|eat out|doordash|uber eats|grubhub)\b/.test(lower)) return 'restaurants';
  if (/\b(course|book|class|learning|education)\b/.test(lower)) return 'education';
  if (/\b(gift|present|birthday)\b/.test(lower)) return 'gifts';
  if (/\b(transfer|savings|invest)\b/.test(lower)) return 'savings';
  
  return 'uncategorized';
}

// ============================================================================
// ACTION PARSING
// ============================================================================

import { db } from '../../db';

/**
 * Parse action blocks from AI response text
 */
export function parseActions(response: string): AIAction[] {
  const actions: AIAction[] = [];
  const actionRegex = /```action\s*\n?\s*(\w+):\s*\n?\s*([\s\S]*?)```/g;
  
  let match;
  while ((match = actionRegex.exec(response)) !== null) {
    const actionType = match[1] as ActionType;
    let paramsStr = match[2].trim();
    
    try {
      // Try JSON parse first
      let params = JSON.parse(paramsStr);
      actions.push({ type: actionType, params });
    } catch (e) {
      // If JSON fails, try to parse JS object notation
      try {
        // Convert JS object notation to JSON
        // Add quotes around unquoted keys
        let jsonStr = paramsStr
          // Add quotes around unquoted keys (key:)
          .replace(/(\w+)(?=\s*:)/g, '"$1"')
          // Fix any double-quoted strings that got re-quoted
          .replace(/""(\w+)""/g, '"$1"');
        
        const params = JSON.parse(jsonStr);
        actions.push({ type: actionType, params });
      } catch (e2) {
        console.error('Failed to parse action params:', paramsStr, e2);
      }
    }
  }
  
  return actions;
}

/**
 * Execute parsed actions
 */
export async function executeActions(
  actions: AIAction[], 
  userId: string
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  
  for (const action of actions) {
    const validation = validateAction(action);
    
    if (!validation.valid) {
      results.push({
        success: false,
        action: action.type,
        error: `Missing required params: ${validation.missing.join(', ')}`,
      });
      continue;
    }
    
    try {
      const result = await executeAction(action, userId);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        action: action.type,
        error: String(error),
      });
    }
  }
  
  return results;
}

/**
 * Execute a single action
 */
async function executeAction(action: AIAction, userId: string): Promise<ActionResult> {
  switch (action.type) {
    case 'CREATE_EVENT':
      return executeCreateEvent(action.params as CreateEventParams, userId);
    case 'UPDATE_EVENT':
      return executeUpdateEvent(action.params as UpdateEventParams, userId);
    case 'DELETE_EVENT':
      return executeDeleteEvent(action.params as DeleteEventParams, userId);
    case 'CREATE_TASK':
      return executeCreateTask(action.params as CreateTaskParams, userId);
    case 'UPDATE_TASK':
      return executeUpdateTask(action.params as UpdateTaskParams, userId);
    case 'MOVE_TASK':
      return executeMoveTask(action.params as MoveTaskParams, userId);
    case 'CREATE_GOAL':
      return executeCreateGoal(action.params as CreateGoalParams, userId);
    case 'UPDATE_GOAL':
      return executeUpdateGoal(action.params as UpdateGoalParams, userId);
    case 'ADD_TASK_TO_GOAL':
      return executeAddTaskToGoal(action.params as AddTaskToGoalParams, userId);
    case 'SET_BALANCE':
      return executeSetBalance(action.params as SetBalanceParams, userId);
    case 'ADD_TRANSACTION':
      return executeAddTransaction(action.params as AddTransactionParams, userId);
    case 'CREATE_DEBT':
      return executeCreateDebt(action.params as CreateDebtParams, userId);
    case 'CREATE_PERSON':
      return executeCreatePerson(action.params as CreatePersonParams, userId);
    case 'LINK_PERSON':
      return executeLinkPerson(action.params as LinkPersonParams, userId);
    default:
      return {
        success: false,
        action: action.type,
        error: 'Unknown action type',
      };
  }
}

// ============================================================================
// EVENT ACTIONS
// ============================================================================

async function executeCreateEvent(params: CreateEventParams, userId: string): Promise<ActionResult> {
  const startDate = parseDate(params.startDate);
  
  const event = await db.event.create({
    data: {
      userId,
      title: params.title,
      startDate,
      endDate: params.endDate ? parseDate(params.endDate) : undefined,
      description: params.description,
      preferredTime: params.preferredTime,
      location: params.location,
      isAllDay: params.isAllDay || false,
      status: 'confirmed',
    },
  });
  
  // Handle cost - create linked transaction
  if (params.cost && params.cost > 0) {
    await db.transaction.create({
      data: {
        userId,
        amount: -params.cost,
        description: `Event: ${params.title}`,
        category: 'entertainment',
        eventId: event.id,
      },
    });
  }
  
  // Handle people linking
  if (params.people && params.people.length > 0) {
    for (const personName of params.people) {
      const person = await db.person.findFirst({
        where: { userId, name: { contains: personName, mode: 'insensitive' } },
      });
      
      if (person) {
        await db.eventPerson.create({
          data: { eventId: event.id, personId: person.id },
        });
      }
    }
  }
  
  return {
    success: true,
    action: 'CREATE_EVENT',
    data: event,
    message: `Created event "${params.title}"`,
  };
}

async function executeUpdateEvent(params: UpdateEventParams, userId: string): Promise<ActionResult> {
  const event = await db.event.update({
    where: { id: params.eventId },
    data: params.updates,
  });
  
  return {
    success: true,
    action: 'UPDATE_EVENT',
    data: event,
    message: 'Event updated',
  };
}

async function executeDeleteEvent(params: DeleteEventParams, userId: string): Promise<ActionResult> {
  await db.event.delete({
    where: { id: params.eventId },
  });
  
  return {
    success: true,
    action: 'DELETE_EVENT',
    message: 'Event deleted',
  };
}

// ============================================================================
// TASK ACTIONS
// ============================================================================

async function executeCreateTask(params: CreateTaskParams, userId: string): Promise<ActionResult> {
  const task = await db.task.create({
    data: {
      userId,
      title: params.title,
      description: params.description,
      dueDate: params.dueDate ? parseDate(params.dueDate) : undefined,
      priority: params.priority || 3,
      goalId: params.goalId,
      eventId: params.eventId,
      estimatedMinutes: params.estimatedMinutes,
      status: 'backlog',
      points: (params.priority || 3) * 5,
    },
  });
  
  // Handle cost
  if (params.cost && params.cost > 0) {
    await db.transaction.create({
      data: {
        userId,
        amount: -params.cost,
        description: `Task: ${params.title}`,
        category: 'shopping',
        taskId: task.id,
      },
    });
  }
  
  return {
    success: true,
    action: 'CREATE_TASK',
    data: task,
    message: `Created task "${params.title}"`,
  };
}

async function executeUpdateTask(params: UpdateTaskParams, userId: string): Promise<ActionResult> {
  const updateData: any = { ...params.updates };
  
  if (params.updates.dueDate) {
    updateData.dueDate = parseDate(params.updates.dueDate);
  }
  
  if (params.updates.status === 'done') {
    updateData.completedAt = new Date();
  }
  
  const task = await db.task.update({
    where: { id: params.taskId },
    data: updateData,
  });
  
  return {
    success: true,
    action: 'UPDATE_TASK',
    data: task,
    message: 'Task updated',
  };
}

async function executeMoveTask(params: MoveTaskParams, userId: string): Promise<ActionResult> {
  const updateData: any = { status: params.status };
  
  if (params.status === 'done') {
    updateData.completedAt = new Date();
  }
  
  const task = await db.task.update({
    where: { id: params.taskId },
    data: updateData,
  });
  
  return {
    success: true,
    action: 'MOVE_TASK',
    data: task,
    message: `Task moved to ${params.status}`,
  };
}

// ============================================================================
// GOAL ACTIONS
// ============================================================================

async function executeCreateGoal(params: CreateGoalParams, userId: string): Promise<ActionResult> {
  const goal = await db.goal.create({
    data: {
      userId,
      title: params.title,
      description: params.description,
      targetDate: params.targetDate ? parseDate(params.targetDate) : undefined,
      targetValue: params.targetValue,
      unit: params.unit,
      status: 'active',
      points: 100,
    },
  });
  
  return {
    success: true,
    action: 'CREATE_GOAL',
    data: goal,
    message: `Created goal "${params.title}"`,
  };
}

async function executeUpdateGoal(params: UpdateGoalParams, userId: string): Promise<ActionResult> {
  const goal = await db.goal.update({
    where: { id: params.goalId },
    data: params.updates,
  });
  
  return {
    success: true,
    action: 'UPDATE_GOAL',
    data: goal,
    message: 'Goal updated',
  };
}

async function executeAddTaskToGoal(params: AddTaskToGoalParams, userId: string): Promise<ActionResult> {
  const task = await db.task.update({
    where: { id: params.taskId },
    data: { goalId: params.goalId },
  });
  
  return {
    success: true,
    action: 'ADD_TASK_TO_GOAL',
    data: task,
    message: 'Task added to goal',
  };
}

// ============================================================================
// FINANCE ACTIONS
// ============================================================================

async function executeSetBalance(params: SetBalanceParams, userId: string): Promise<ActionResult> {
  // Create a balance adjustment transaction
  const currentBalance = await db.transaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  
  const adjustment = params.amount - (currentBalance._sum.amount || 0);
  
  await db.transaction.create({
    data: {
      userId,
      amount: adjustment,
      description: params.note || 'Balance adjustment',
      category: 'income',
    },
  });
  
  return {
    success: true,
    action: 'SET_BALANCE',
    data: { newBalance: params.amount },
    message: `Balance set to $${params.amount.toFixed(2)}`,
  };
}

async function executeAddTransaction(params: AddTransactionParams, userId: string): Promise<ActionResult> {
  const transaction = await db.transaction.create({
    data: {
      userId,
      amount: params.amount,
      description: params.description,
      category: params.category || inferCategory(params.description),
      date: params.date ? parseDate(params.date) : new Date(),
      eventId: params.eventId,
      taskId: params.taskId,
      debtId: params.debtId,
    },
  });
  
  return {
    success: true,
    action: 'ADD_TRANSACTION',
    data: transaction,
    message: `Added transaction: ${params.description}`,
  };
}

async function executeCreateDebt(params: CreateDebtParams, userId: string): Promise<ActionResult> {
  const debt = await db.debt.create({
    data: {
      userId,
      name: params.name,
      originalAmount: params.amount,
      currentAmount: params.amount,
      isOwed: params.isOwed,
      dueDate: params.dueDate ? parseDate(params.dueDate) : undefined,
      notes: params.notes,
    },
  });
  
  return {
    success: true,
    action: 'CREATE_DEBT',
    data: debt,
    message: `Created debt record for "${params.name}"`,
  };
}

// ============================================================================
// PEOPLE ACTIONS
// ============================================================================

async function executeCreatePerson(params: CreatePersonParams, userId: string): Promise<ActionResult> {
  const person = await db.person.create({
    data: {
      userId,
      name: params.name,
      nickname: params.nickname,
      relationship: params.relationship,
      notes: params.notes,
      email: params.email,
      phone: params.phone,
      importantDates: params.importantDates ? JSON.stringify(params.importantDates) : undefined,
    },
  });
  
  return {
    success: true,
    action: 'CREATE_PERSON',
    data: person,
    message: `Added ${params.name} to your contacts`,
  };
}

async function executeLinkPerson(params: LinkPersonParams, userId: string): Promise<ActionResult> {
  await db.eventPerson.create({
    data: {
      eventId: params.eventId,
      personId: params.personId,
      role: params.role,
    },
  });
  
  return {
    success: true,
    action: 'LINK_PERSON',
    message: 'Person linked to event',
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function parseDate(dateStr: string): Date {
  // Check for relative dates
  const lower = dateStr.toLowerCase();
  
  // Parse time from strings like "today at 3pm" or "tomorrow at 3 pm"
  const timeMatch = lower.match(/(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)?\s*(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  
  // Base date
  let baseDate = new Date();
  
  // Check for "tomorrow"
  if (lower.includes('tomorrow')) {
    baseDate.setDate(baseDate.getDate() + 1);
  }
  
  // Check for "today at X" or "tomorrow at X"
  if (timeMatch && (lower.includes('today') || lower.includes('tomorrow'))) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();
    
    // Convert 12-hour to 24-hour format
    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }
    
    baseDate.setHours(hours, minutes, 0, 0);
    return baseDate;
  }
  
  if (lower === 'today') {
    baseDate.setHours(12, 0, 0, 0);
    return baseDate;
  }
  
  if (lower === 'tomorrow') {
    baseDate.setDate(baseDate.getDate() + 1);
    baseDate.setHours(12, 0, 0, 0);
    return baseDate;
  }
  
  // Check for "in X days"
  const inDaysMatch = dateStr.match(/in (\d+) days?/i);
  if (inDaysMatch) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
    return d;
  }
  
  // Check for "in X weeks"
  const inWeeksMatch = dateStr.match(/in (\d+) weeks?/i);
  if (inWeeksMatch) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(inWeeksMatch[1]) * 7);
    return d;
  }
  
  // Check for "next week"
  if (lower === 'next week') {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }
  
  // Try to parse as ISO or natural date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Default to tomorrow
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}
