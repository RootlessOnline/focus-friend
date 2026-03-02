'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { DashboardView } from '@/components/views/dashboard-view';
import { ChatView } from '@/components/views/chat-view';
import { CalendarView } from '@/components/views/calendar-view';
import { FinancesView } from '@/components/views/finances-view';
import { TasksView } from '@/components/views/tasks-view';
import { GoalsView } from '@/components/views/goals-view';
import { BionicView } from '@/components/views/bionic-view';
import { PeopleView } from '@/components/views/people-view';

// Types
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'backlog' | 'doing' | 'done' | 'skipped' | 'archived';
  priority: number;
  dueDate?: Date;
  estimatedMinutes?: number;
  points: number;
  goalId?: string;
  goal?: { title: string; isRecurring?: boolean };
  category?: string;
  isRecurringInstance?: boolean;
}

interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  priority: number;
  estimatedMinutes?: number;
  category?: string;
  points: number;
  icon?: string;
  isPinned: boolean;
  useCount: number;
}

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isAllDay?: boolean;
  preferredTime?: string;
  location?: string;
  status: string;
  transactions?: { amount: number; description: string }[];
  people?: { name: string }[];
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
  isRecurring?: boolean;
  eventId?: string;
  event?: { title: string };
  taskId?: string;
  task?: { title: string };
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue?: number;
  currentValue: number;
  unit?: string;
  targetDate?: Date;
  status: string;
  points: number;
  tasks: { id: string; title: string; status: string; points: number }[];
  isRecurring?: boolean;
  recurrenceType?: string;
  recurrenceDays?: string;
  totalCompletions?: number;
  totalSkips?: number;
  currentStreak?: number;
  longestStreak?: number;
}

interface Person {
  id: string;
  name: string;
  nickname?: string;
  relationship?: string;
  notes?: string;
  email?: string;
  phone?: string;
  lastContactDate?: Date;
  importantDates?: Array<{ type: string; date: string }>;
  events?: Array<{ id: string; title: string; startDate: Date }>;
}

interface PdfDocument {
  id: string;
  originalName: string;
  status: string;
  pageCount?: number;
  wordCount?: number;
  createdAt: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: { type: string; success: boolean; message?: string }[];
}

// Demo user ID (in real app, this would come from auth)
const DEMO_USER_ID = 'demo-user';

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get('view') || 'dashboard';

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [balance, setBalance] = useState(100);
  const [warnings, setWarnings] = useState<string[]>([]);

  const initializeDemoData = useCallback(() => {
    // Sample tasks
    const demoTasks: Task[] = [
      { id: '1', title: 'Buy groceries', status: 'backlog', priority: 4, points: 10, dueDate: new Date(Date.now() + 86400000) },
      { id: '2', title: 'Finish project report', status: 'doing', priority: 5, points: 25, dueDate: new Date(Date.now() + 172800000) },
      { id: '3', title: 'Call mom', status: 'backlog', priority: 3, points: 5 },
      { id: '4', title: 'Exercise for 30 min', status: 'done', priority: 3, points: 15, goalId: '1', goal: { title: 'Stay Healthy' } },
    ];

    // Sample events
    const demoEvents: Event[] = [
      { id: '1', title: 'Team Meeting', startDate: new Date(Date.now() + 3600000), preferredTime: 'morning', status: 'confirmed' },
      { id: '2', title: 'Doctor Appointment', startDate: new Date(Date.now() + 86400000), preferredTime: 'midday', location: 'City Hospital', status: 'confirmed' },
      { id: '3', title: 'Zoo Trip with Sarah', startDate: new Date(Date.now() + 604800000), preferredTime: 'morning', status: 'tentative', people: [{ name: 'Sarah' }] },
    ];

    // Sample transactions
    const demoTransactions: Transaction[] = [
      { id: '1', amount: -45.50, description: 'Weekly groceries', category: 'groceries', date: new Date(Date.now() - 86400000) },
      { id: '2', amount: -12.99, description: 'Netflix subscription', category: 'subscription', date: new Date(Date.now() - 172800000), isRecurring: true },
      { id: '3', amount: 1500, description: 'Monthly salary', category: 'income', date: new Date(Date.now() - 604800000), isRecurring: true },
    ];

    // Sample goals
    const demoGoals: Goal[] = [
      { id: '1', title: 'Stay Healthy', description: 'Exercise regularly and eat well', targetValue: 20, currentValue: 8, unit: 'sessions', status: 'active', points: 100, tasks: [{ id: '4', title: 'Exercise for 30 min', status: 'done', points: 15 }] },
      { id: '2', title: 'Learn Spanish', description: 'Practice Spanish daily', targetValue: 100, currentValue: 25, unit: 'lessons', status: 'active', points: 200, tasks: [] },
    ];

    // Sample people
    const demoPeople: Person[] = [
      { id: '1', name: 'Sarah', nickname: 'Sar', relationship: 'friend', notes: 'Met at college, loves animals', lastContactDate: new Date(Date.now() - 172800000), events: [{ id: '3', title: 'Zoo Trip', startDate: new Date(Date.now() + 604800000) }] },
      { id: '2', name: 'Mom', relationship: 'family', importantDates: [{ type: 'birthday', date: '1965-03-15' }] },
    ];

    setTasks(demoTasks);
    setEvents(demoEvents);
    setTransactions(demoTransactions);
    setGoals(demoGoals);
    setPeople(demoPeople);
    setWarnings(['Your phone bill is due in 3 days!', 'Balance is getting low - consider budgeting.']);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setEvents(data.events || []);
        setTransactions(data.transactions || []);
        setGoals(data.goals || []);
        setPeople(data.people || []);
        setDocuments(data.documents || []);
        setTemplates(data.templates || []);
        setBalance(data.balance || 100);
        setWarnings(data.warnings || []);
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // Initialize with demo data
      initializeDemoData();
    }
    setIsLoading(false);
  }, [initializeDemoData]);

  // Track if data has been loaded
  const dataLoadedRef = useRef(false);

  // Initialize data on mount
  useEffect(() => {
    if (!dataLoadedRef.current) {
      dataLoadedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData();
    }
  }, [loadData]);

  // Navigation
  const navigateTo = useCallback((newView: string) => {
    router.push(`/?view=${newView}`);
  }, [router]);

  // Chat handlers
  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history: messages }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          actions: data.actions,
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Refresh data if actions were taken
        if (data.actions && data.actions.length > 0) {
          loadData();
        }
      } else {
        // Fallback response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I'm here to help! Let me process that for you~ :3",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Oops, something went wrong! But don't worry, I'm still here to help~ :3",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setChatLoading(false);
  };

  // Task handlers
  const handleCreateTask = async (task: Partial<Task>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask]);
      } else {
        // Fallback for demo
        const newTask: Task = {
          id: Date.now().toString(),
          title: task.title || '',
          description: task.description,
          status: task.status || 'backlog',
          priority: task.priority || 3,
          dueDate: task.dueDate,
          estimatedMinutes: task.estimatedMinutes,
          points: (task.priority || 3) * 5,
          goalId: task.goalId,
        };
        setTasks(prev => [...prev, newTask]);
      }
    } catch (error) {
      console.error('Create task error:', error);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...updates }),
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
        
        // If task completed, update goal progress
        if (updates.status === 'done') {
          const task = tasks.find(t => t.id === taskId);
          if (task?.goalId) {
            setGoals(prev => prev.map(g => {
              if (g.id === task.goalId) {
                return { ...g, currentValue: g.currentValue + 1 };
              }
              return g;
            }));
          }
        }
      }
    } catch (error) {
      console.error('Update task error:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Delete task error:', error);
    }
  };

  // Event handlers
  const handleCreateEvent = async (event: Partial<Event>) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (res.ok) {
        const newEvent = await res.json();
        setEvents(prev => [...prev, newEvent]);
      } else {
        // Fallback for demo
        const newEvent: Event = {
          id: Date.now().toString(),
          title: event.title || '',
          description: event.description,
          startDate: event.startDate || new Date(),
          endDate: event.endDate,
          isAllDay: event.isAllDay,
          preferredTime: event.preferredTime,
          location: event.location,
          status: 'confirmed',
        };
        setEvents(prev => [...prev, newEvent]);
      }
    } catch (error) {
      console.error('Create event error:', error);
    }
  };

  const handleUpdateEvent = async (eventId: string, updates: Partial<Event>) => {
    try {
      await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, ...updates }),
      });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...updates } : e));
    } catch (error) {
      console.error('Update event error:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' });
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Delete event error:', error);
    }
  };

  // Finance handlers
  const handleAddTransaction = async (transaction: Partial<Transaction>) => {
    try {
      const res = await fetch('/api/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });
      if (res.ok) {
        const newTx = await res.json();
        setTransactions(prev => [newTx, ...prev]);
        setBalance(prev => prev + (transaction.amount || 0));
      } else {
        // Fallback for demo
        const newTx: Transaction = {
          id: Date.now().toString(),
          amount: transaction.amount || 0,
          description: transaction.description || '',
          category: transaction.category || 'uncategorized',
          date: transaction.date || new Date(),
        };
        setTransactions(prev => [newTx, ...prev]);
        setBalance(prev => prev + (transaction.amount || 0));
      }
    } catch (error) {
      console.error('Add transaction error:', error);
    }
  };

  const handleSetBalance = async (amount: number) => {
    try {
      await fetch('/api/finances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: amount }),
      });
      setBalance(amount);
    } catch (error) {
      console.error('Set balance error:', error);
    }
  };

  // Goal handlers
  const handleCreateGoal = async (goal: Partial<Goal>) => {
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goal),
      });
      if (res.ok) {
        const newGoal = await res.json();
        setGoals(prev => [...prev, newGoal]);
      } else {
        const newGoal: Goal = {
          id: Date.now().toString(),
          title: goal.title || '',
          description: goal.description,
          targetValue: goal.targetValue,
          currentValue: 0,
          unit: goal.unit,
          targetDate: goal.targetDate,
          status: 'active',
          points: 100,
          tasks: [],
        };
        setGoals(prev => [...prev, newGoal]);
      }
    } catch (error) {
      console.error('Create goal error:', error);
    }
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    try {
      await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, ...updates }),
      });
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...updates } : g));
    } catch (error) {
      console.error('Update goal error:', error);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await fetch(`/api/goals?id=${goalId}`, { method: 'DELETE' });
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('Delete goal error:', error);
    }
  };

  const handleAddTaskToGoal = async (taskId: string, goalId: string) => {
    try {
      await fetch('/api/goals/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, goalId }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, goalId } : t));
    } catch (error) {
      console.error('Add task to goal error:', error);
    }
  };

  // People handlers
  const handleCreatePerson = async (person: Partial<Person>) => {
    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(person),
      });
      if (res.ok) {
        const newPerson = await res.json();
        setPeople(prev => [...prev, newPerson]);
      } else {
        const newPerson: Person = {
          id: Date.now().toString(),
          name: person.name || '',
          nickname: person.nickname,
          relationship: person.relationship,
          notes: person.notes,
          email: person.email,
          phone: person.phone,
        };
        setPeople(prev => [...prev, newPerson]);
      }
    } catch (error) {
      console.error('Create person error:', error);
    }
  };

  const handleUpdatePerson = async (personId: string, updates: Partial<Person>) => {
    try {
      await fetch('/api/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: personId, ...updates }),
      });
      setPeople(prev => prev.map(p => p.id === personId ? { ...p, ...updates } : p));
    } catch (error) {
      console.error('Update person error:', error);
    }
  };

  const handleDeletePerson = async (personId: string) => {
    try {
      await fetch(`/api/people?id=${personId}`, { method: 'DELETE' });
      setPeople(prev => prev.filter(p => p.id !== personId));
    } catch (error) {
      console.error('Delete person error:', error);
    }
  };

  // PDF handlers
  const handleUploadPdf = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/bionic', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newDoc = await res.json();
        setDocuments(prev => [...prev, newDoc]);
      }
    } catch (error) {
      console.error('Upload PDF error:', error);
    }
  };

  const handleProcessPdf = async (documentId: string, options: { boldRatio: number }) => {
    setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, status: 'processing' } : d));

    try {
      await fetch('/api/bionic', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: documentId, ...options }),
      });

      // Simulate processing
      setTimeout(() => {
        setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, status: 'ready' } : d));
      }, 2000);
    } catch (error) {
      console.error('Process PDF error:', error);
      setDocuments(prev => prev.map(d => d.id === documentId ? { ...d, status: 'error' } : d));
    }
  };

  const handleDownloadPdf = async (documentId: string) => {
    try {
      window.open(`/api/bionic/download?id=${documentId}`, '_blank');
    } catch (error) {
      console.error('Download PDF error:', error);
    }
  };

  const handleDeletePdf = async (documentId: string) => {
    try {
      await fetch(`/api/bionic?id=${documentId}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== documentId));
    } catch (error) {
      console.error('Delete PDF error:', error);
    }
  };

  // Calculate derived data
  const pendingIncome = transactions
    .filter(t => t.amount > 0 && t.isRecurring)
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingExpenses = Math.abs(transactions
    .filter(t => t.amount < 0 && t.isRecurring)
    .reduce((sum, t) => sum + t.amount, 0));

  const upcomingEvents = events
    .filter(e => new Date(e.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 7);

  const overdueTasks = tasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => b.priority - a.priority);

  const activeGoals = goals.filter(g => g.status === 'active');

  // Render view based on URL param
  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-neon-pink to-neon-cyan animate-pulse" />
            <p className="text-muted-foreground">Loading your life data~ :3</p>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'chat':
        return (
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={chatLoading}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            events={events}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onSyncComplete={loadData}
          />
        );
      case 'finances':
        return (
          <FinancesView
            data={{
              balance,
              transactions,
              pendingIncome,
              pendingExpenses,
              projectedBalance: balance + pendingIncome - pendingExpenses,
              warnings,
            }}
            onAddTransaction={handleAddTransaction}
            onSetBalance={handleSetBalance}
          />
        );
      case 'tasks':
        return (
          <TasksView
            tasks={tasks}
            goals={goals}
            templates={templates}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onCreateGoal={handleCreateGoal}
          />
        );
      case 'goals':
        return (
          <GoalsView
            goals={goals}
            onCreateGoal={handleCreateGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
            onAddTaskToGoal={handleAddTaskToGoal}
          />
        );
      case 'bionic':
        return (
          <BionicView
            documents={documents}
            onUpload={handleUploadPdf}
            onProcess={handleProcessPdf}
            onDownload={handleDownloadPdf}
            onDelete={handleDeletePdf}
            isProcessing={false}
          />
        );
      case 'people':
        return (
          <PeopleView
            people={people}
            onCreatePerson={handleCreatePerson}
            onUpdatePerson={handleUpdatePerson}
            onDeletePerson={handleDeletePerson}
          />
        );
      default:
        return (
          <DashboardView
            data={{
              balance,
              upcomingEvents,
              overdueTasks,
              activeGoals,
              recentTransactions: transactions.slice(0, 6),
              warnings,
            }}
            onNavigate={navigateTo}
          />
        );
    }
  };

  return (
    <AppShell>
      {renderView()}
    </AppShell>
  );
}
