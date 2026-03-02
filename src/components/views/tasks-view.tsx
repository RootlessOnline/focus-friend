'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  Plus,
  CheckSquare,
  Clock,
  Target,
  GripVertical,
  Calendar,
  Sparkles,
  Archive,
  Trophy,
  Trash2,
  Star,
  Zap,
  SkipForward,
  Timer,
  Play,
  Pause,
  RotateCcw,
  X,
  Copy,
  Flame,
  ChevronDown,
  ChevronUp,
  Edit2,
  Repeat,
  Settings,
  LayoutTemplate,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'backlog' | 'doing' | 'done' | 'archived' | 'skipped';
  priority: number;
  dueDate?: Date;
  estimatedMinutes?: number;
  points: number;
  goalId?: string;
  goal?: { title: string; isRecurring?: boolean };
  completedAt?: Date;
  skippedAt?: Date;
  isRecurringInstance?: boolean;
  recurringTaskDate?: Date;
  category?: string;
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  isRecurring?: boolean;
  recurrenceType?: string;
  recurrenceDays?: string;
  preferredTime?: string;
  totalCompletions?: number;
  totalSkips?: number;
  currentStreak?: number;
  longestStreak?: number;
  status: string;
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

interface TasksViewProps {
  tasks: Task[];
  goals?: Goal[];
  templates?: TaskTemplate[];
  onCreateTask: (task: Partial<Task>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onCreateTemplate?: (template: Partial<TaskTemplate>) => void;
  onCreateGoal?: (goal: Partial<Goal>) => void;
}

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'border-l-blue-500', icon: CheckSquare },
  { id: 'doing', title: 'Doing', color: 'border-l-orange-500', icon: Clock },
  { id: 'done', title: 'Done', color: 'border-l-green-500', icon: Target },
  { id: 'skipped', title: 'Skipped', color: 'border-l-yellow-500', icon: SkipForward },
  { id: 'archived', title: 'Archive', color: 'border-l-gray-500', icon: Archive },
];

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  2: 'bg-green-500/20 text-green-400 border-green-500/30',
  3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  5: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const CATEGORY_ICONS: Record<string, string> = {
  work: '💼',
  personal: '🏠',
  health: '💪',
  finance: '💰',
  social: '👥',
};

// ============================================================================
// NATURAL LANGUAGE PARSER
// ============================================================================

function parseNaturalLanguageTask(input: string): Partial<Task> {
  const lower = input.toLowerCase();
  
  // Extract priority (p1-p5, critical, high, medium, low)
  let priority = 3;
  if (lower.includes('critical') || lower.includes('urgent') || lower.includes('p5')) priority = 5;
  else if (lower.includes('high') || lower.includes('important') || lower.includes('p4')) priority = 4;
  else if (lower.includes('medium') || lower.includes('normal') || lower.includes('p3')) priority = 3;
  else if (lower.includes('low') || lower.includes('p2')) priority = 2;
  else if (lower.includes('p1')) priority = 1;
  
  // Extract time estimate
  let estimatedMinutes: number | undefined;
  const minMatch = input.match(/(\d+)\s*(?:min|minutes?)/i);
  const hourMatch = input.match(/(\d+)\s*(?:hr|hours?)/i);
  if (minMatch) estimatedMinutes = parseInt(minMatch[1]);
  if (hourMatch) estimatedMinutes = (estimatedMinutes || 0) + parseInt(hourMatch[1]) * 60;
  
  // Extract due date
  let dueDate: Date | undefined;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (lower.includes('today')) dueDate = new Date();
  else if (lower.includes('tomorrow')) dueDate = tomorrow;
  else if (lower.includes('next week')) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    dueDate = nextWeek;
  }
  
  // Extract time of day
  const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch && dueDate) {
    let hours = parseInt(timeMatch[1]);
    const meridiem = timeMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    dueDate.setHours(hours, timeMatch[2] ? parseInt(timeMatch[2]) : 0, 0, 0);
  }
  
  // Extract category
  let category: string | undefined;
  if (lower.includes('work')) category = 'work';
  else if (lower.includes('personal') || lower.includes('home')) category = 'personal';
  else if (lower.includes('gym') || lower.includes('exercise') || lower.includes('health') || lower.includes('workout')) category = 'health';
  else if (lower.includes('buy') || lower.includes('pay') || lower.includes('money') || lower.includes('finance')) category = 'finance';
  else if (lower.includes('meet') || lower.includes('call') || lower.includes('friend')) category = 'social';
  
  // Clean title - remove parsed elements
  let title = input
    .replace(/\s*(critical|urgent|high|medium|low|important|normal)\s*/gi, ' ')
    .replace(/\s*p[1-5]\s*/gi, ' ')
    .replace(/\s*\d+\s*(?:min|minutes?|hr|hours?)\s*/gi, ' ')
    .replace(/\s*(today|tomorrow|next week)\s*/gi, ' ')
    .replace(/\s*at\s+\d{1,2}(?::\d{2})?\s*(am|pm)?\s*/gi, ' ')
    .replace(/\s*(work|personal|home|health|finance|social)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Points based on priority
  const points = priority * 5;
  
  return {
    title: title || input,
    priority,
    estimatedMinutes,
    dueDate,
    category,
    points,
  };
}

// ============================================================================
// DRAGGABLE TASK CARD
// ============================================================================

function DraggableTaskCard({ 
  task, 
  formatDate, 
  onComplete, 
  onSkip, 
  onArchive, 
  onDelete,
  onDuplicate,
  isDragging = false,
  speedRunMode = false,
}: { 
  task: Task;
  formatDate: (date: Date | string) => string;
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (taskId: string) => void;
  isDragging?: boolean;
  speedRunMode?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const isRecurringGoalTask = task.goal?.isRecurring;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`
          p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]
          hover:border-neon-pink hover:shadow-[var(--glow-pink)] transition-all
          ${isDragging ? 'opacity-30' : ''}
          ${task.status === 'skipped' ? 'opacity-60 border-l-4 border-l-yellow-500' : ''}
          ${speedRunMode && task.status === 'doing' ? 'ring-2 ring-neon-cyan animate-pulse' : ''}
        `}
        {...listeners}
        {...attributes}
      >
        <div 
          className="cursor-pointer"
          onClick={() => !isDragging && setShowDetails(true)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{task.title}</p>
                {isRecurringGoalTask && (
                  <Repeat className="w-3 h-3 text-neon-purple flex-shrink-0" />
                )}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
              P{task.priority}
            </Badge>
            {task.dueDate && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(task.dueDate)}
              </Badge>
            )}
            {task.estimatedMinutes && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.estimatedMinutes}m
              </Badge>
            )}
            {task.points > 0 && (
              <Badge variant="outline" className="text-xs text-neon-yellow border-neon-yellow/30">
                <Sparkles className="w-3 h-3 mr-1" />
                +{task.points}
              </Badge>
            )}
            {task.category && (
              <span className="text-xs">{CATEGORY_ICONS[task.category]}</span>
            )}
          </div>

          {task.goal && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              {task.goal.title}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--border-subtle)]" onClick={(e) => e.stopPropagation()}>
          {task.status !== 'done' && task.status !== 'archived' && task.status !== 'skipped' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-neon-green hover:text-neon-green hover:bg-neon-green/10"
                onClick={() => onComplete(task.id)}
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                Done
              </Button>
              {isRecurringGoalTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                  onClick={() => onSkip(task.id)}
                >
                  <SkipForward className="w-3 h-3 mr-1" />
                  Skip
                </Button>
              )}
            </>
          )}
          {task.status === 'done' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-neon-yellow hover:text-neon-yellow"
                onClick={() => {}}
              >
                <Trophy className="w-3 h-3 mr-1" />
                Trophy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => onArchive(task.id)}
              >
                <Archive className="w-3 h-3 mr-1" />
                Archive
              </Button>
            </>
          )}
          {task.status === 'skipped' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-neon-green hover:text-neon-green"
              onClick={() => onComplete(task.id)}
            >
              <CheckSquare className="w-3 h-3 mr-1" />
              Complete
            </Button>
          )}
          {task.status === 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)] max-w-md">
          <DialogHeader>
            <DialogTitle className="gradient-text-dva">{task.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {task.description && (
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 text-sm">{task.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Priority</Label>
                <Badge className={`mt-1 ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority === 1 ? 'Low' : task.priority === 2 ? 'Low-Med' : task.priority === 3 ? 'Medium' : task.priority === 4 ? 'High' : 'Critical'}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge variant="outline" className="mt-1 capitalize">{task.status}</Badge>
              </div>
            </div>
            {task.dueDate && (
              <div>
                <Label className="text-muted-foreground">Due Date</Label>
                <p className="mt-1 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(task.dueDate)}
                </p>
              </div>
            )}
            {task.points > 0 && (
              <div>
                <Label className="text-muted-foreground">Points</Label>
                <p className="mt-1 text-sm flex items-center gap-2 text-neon-yellow">
                  <Sparkles className="w-4 h-4" />
                  +{task.points} points
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-4">
              {task.status !== 'done' && task.status !== 'archived' && (
                <Button 
                  className="flex-1 btn-neon-primary"
                  onClick={() => { onComplete(task.id); setShowDetails(false); }}
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Mark Done
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={() => { onDuplicate(task.id); setShowDetails(false); }}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button 
                variant="destructive"
                onClick={() => { onDelete(task.id); setShowDetails(false); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// DROPPABLE COLUMN
// ============================================================================

function DroppableColumn({ 
  column, 
  tasks, 
  formatDate, 
  onComplete,
  onSkip,
  onArchive,
  onDelete,
  onDuplicate,
  speedRunMode,
}: { 
  column: typeof COLUMNS[0];
  tasks: Task[];
  formatDate: (date: Date | string) => string;
  onComplete: (taskId: string) => void;
  onSkip: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (taskId: string) => void;
  speedRunMode: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ 
    id: column.id,
    data: { column },
  });

  return (
    <Card className={`flex flex-col bg-[var(--bg-surface)] transition-all ${isOver ? 'ring-2 ring-neon-pink ring-opacity-50' : ''}`}>
      <CardHeader className={`p-4 ${column.color} border-l-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <column.icon className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">{column.title}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
        {column.id === 'done' && tasks.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-neon-yellow">
            <Star className="w-3 h-3" />
            {tasks.reduce((sum, t) => sum + t.points, 0)} points earned
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-2 overflow-hidden" ref={setNodeRef}>
        <ScrollArea className="h-full pr-2 min-h-[200px]">
          <div className="space-y-2">
            {tasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                formatDate={formatDate}
                onComplete={onComplete}
                onSkip={onSkip}
                onArchive={onArchive}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                speedRunMode={speedRunMode}
              />
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {column.id === 'done' ? 'Complete tasks will appear here~' : 
                 column.id === 'skipped' ? 'Skipped recurring tasks' :
                 column.id === 'archived' ? 'Archived tasks go here' :
                 'Drag tasks here or create new ones!'}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SPEED RUN MODE COMPONENT
// ============================================================================

function SpeedRunMode({ 
  isActive, 
  onStart, 
  onStop, 
  timer, 
  completedCount,
  pointsEarned,
  currentTask,
  onCompleteTask,
}: {
  isActive: boolean;
  onStart: (minutes: number) => void;
  onStop: () => void;
  timer: number;
  completedCount: number;
  pointsEarned: number;
  currentTask: Task | null;
  onCompleteTask: () => void;
}) {
  const [selectedTime, setSelectedTime] = useState(5);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return (
      <Card className="bg-gradient-to-r from-neon-pink/10 to-neon-cyan/10 border-neon-pink/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neon-pink/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-neon-pink" />
              </div>
              <div>
                <h3 className="font-bold">Speed Run Mode</h3>
                <p className="text-xs text-muted-foreground">Race against the clock!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedTime.toString()} onValueChange={(v) => setSelectedTime(parseInt(v))}>
                <SelectTrigger className="w-20 bg-[var(--bg-card)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 min</SelectItem>
                  <SelectItem value="10">10 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="25">25 min</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => onStart(selectedTime)} className="btn-neon-primary">
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-neon-pink/20 to-neon-cyan/20 border-neon-cyan animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">TIME LEFT</p>
              <p className={`text-3xl font-mono font-bold ${timer < 60 ? 'text-red-400' : 'text-neon-cyan'}`}>
                {formatTime(timer)}
              </p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">COMPLETED</p>
              <p className="text-3xl font-bold text-neon-green">{completedCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">POINTS</p>
              <p className="text-3xl font-bold text-neon-yellow">{pointsEarned}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentTask && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Current: <strong>{currentTask.title}</strong></span>
                <Button onClick={onCompleteTask} size="sm" className="btn-neon-primary">
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Done
                </Button>
              </div>
            )}
            <Button onClick={onStop} variant="destructive" size="sm">
              <X className="w-4 h-4 mr-1" />
              Stop
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// QUICK ADD BAR
// ============================================================================

function QuickAddBar({ onAddTask, templates }: { onAddTask: (task: Partial<Task>) => void; templates: TaskTemplate[] }) {
  const [input, setInput] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const parsed = parseNaturalLanguageTask(input);
    onAddTask(parsed);
    setInput('');
  };

  const handleTemplateClick = (template: TaskTemplate) => {
    onAddTask({
      title: template.title,
      description: template.description,
      priority: template.priority,
      estimatedMinutes: template.estimatedMinutes,
      category: template.category,
      points: template.points,
    });
    setShowTemplates(false);
  };

  const pinnedTemplates = templates.filter(t => t.isPinned).slice(0, 5);

  return (
    <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
      <CardContent className="p-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Plus className="w-5 h-5 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add task: 'Buy groceries tomorrow at 5pm high priority'"
            className="flex-1 bg-[var(--bg-card)] border-[var(--border-default)]"
          />
          <Button type="submit" disabled={!input.trim()} className="btn-neon-primary">
            Add
          </Button>
          {pinnedTemplates.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <LayoutTemplate className="w-4 h-4" />
            </Button>
          )}
        </form>
        
        {/* Templates Dropdown */}
        {showTemplates && pinnedTemplates.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {pinnedTemplates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                onClick={() => handleTemplateClick(template)}
                className="text-xs"
              >
                {template.icon} {template.title}
              </Button>
            ))}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-2">
          💡 Try: "Gym tomorrow at 6pm high priority 1hr" or "Call mom today 15min"
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN TASKS VIEW
// ============================================================================

export function TasksView({ 
  tasks, 
  goals = [], 
  templates = [],
  onCreateTask, 
  onUpdateTask, 
  onDeleteTask,
  onCreateTemplate,
  onCreateGoal,
}: TasksViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGoalStats, setShowGoalStats] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<Task[]>([]);
  
  // Speed Run Mode State
  const [speedRunMode, setSpeedRunMode] = useState(false);
  const [speedRunTimer, setSpeedRunTimer] = useState(0);
  const [completedInSpeedRun, setCompletedInSpeedRun] = useState(0);
  const [pointsInSpeedRun, setPointsInSpeedRun] = useState(0);

  // New Task Form State
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 3,
    dueDate: '',
    estimatedMinutes: '',
    category: '',
    goalId: '',
    isRecurring: false,
    recurrenceType: '',
    recurrenceDays: [] as string[],
  });

  // Calculate points
  const totalEarnedPoints = useMemo(() => {
    return tasks
      .filter(t => t.status === 'done')
      .reduce((sum, t) => sum + t.points, 0);
  }, [tasks]);

  const totalPendingPoints = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done' && t.status !== 'archived' && t.status !== 'skipped')
      .reduce((sum, t) => sum + t.points, 0);
  }, [tasks]);

  // Speed Run Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (speedRunMode && speedRunTimer > 0) {
      interval = setInterval(() => {
        setSpeedRunTimer(prev => {
          if (prev <= 1) {
            setSpeedRunMode(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [speedRunMode, speedRunTimer]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let newStatus: 'backlog' | 'doing' | 'done' | 'archived' | 'skipped' | null = null;
    
    if (COLUMNS.some(col => col.id === over.id)) {
      newStatus = over.id as 'backlog' | 'doing' | 'done' | 'archived' | 'skipped';
    } else {
      const targetTask = tasks.find(t => t.id === over.id);
      if (targetTask && targetTask.status !== task.status) {
        newStatus = targetTask.status;
      }
    }

    if (newStatus && task.status !== newStatus) {
      onUpdateTask(taskId, { 
        status: newStatus,
        ...(newStatus === 'done' ? { completedAt: new Date() } : {}),
        ...(newStatus === 'skipped' ? { skippedAt: new Date() } : {}),
      });
      
      // Speed Run Mode tracking
      if (speedRunMode && newStatus === 'done') {
        setCompletedInSpeedRun(prev => prev + 1);
        setPointsInSpeedRun(prev => prev + task.points);
      }
    }
  };

  const handleCreateTask = () => {
    onCreateTask({
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      estimatedMinutes: newTask.estimatedMinutes ? parseInt(newTask.estimatedMinutes) : undefined,
      category: newTask.category || undefined,
      goalId: newTask.goalId || undefined,
    });
    
    // If recurring, create a goal too
    if (newTask.isRecurring && newTask.recurrenceType && onCreateGoal) {
      onCreateGoal({
        title: newTask.title,
        isRecurring: true,
        recurrenceType: newTask.recurrenceType,
        recurrenceDays: JSON.stringify(newTask.recurrenceDays),
      });
    }
    
    setNewTask({ 
      title: '', 
      description: '', 
      priority: 3, 
      dueDate: '', 
      estimatedMinutes: '',
      category: '',
      goalId: '',
      isRecurring: false,
      recurrenceType: '',
      recurrenceDays: [],
    });
    setIsCreateOpen(false);
  };

  const handleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    onUpdateTask(taskId, { 
      status: 'done',
      completedAt: new Date()
    });
    
    if (speedRunMode && task) {
      setCompletedInSpeedRun(prev => prev + 1);
      setPointsInSpeedRun(prev => prev + task.points);
    }
  };

  const handleSkip = (taskId: string) => {
    onUpdateTask(taskId, { 
      status: 'skipped',
      skippedAt: new Date()
    });
  };

  const handleArchive = (taskId: string) => {
    onUpdateTask(taskId, { status: 'archived' });
  };

  const handleDuplicate = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      onCreateTask({
        title: `Copy: ${task.title}`,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        estimatedMinutes: task.estimatedMinutes,
        category: task.category,
        points: task.points,
      });
    }
  };

  const handleStartSpeedRun = (minutes: number) => {
    setSpeedRunMode(true);
    setSpeedRunTimer(minutes * 60);
    setCompletedInSpeedRun(0);
    setPointsInSpeedRun(0);
    
    // Move first task in backlog to doing
    const firstTask = tasks.find(t => t.status === 'backlog');
    if (firstTask) {
      onUpdateTask(firstTask.id, { status: 'doing' });
    }
  };

  const handleStopSpeedRun = () => {
    setSpeedRunMode(false);
    setSpeedRunTimer(0);
  };

  const handleSpeedRunComplete = () => {
    const doingTask = tasks.find(t => t.status === 'doing');
    if (doingTask) {
      handleComplete(doingTask.id);
      
      // Move next backlog task to doing
      const nextTask = tasks.find(t => t.status === 'backlog');
      if (nextTask) {
        onUpdateTask(nextTask.id, { status: 'doing' });
      }
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status);
  
  const currentSpeedRunTask = speedRunMode ? tasks.find(t => t.status === 'doing') : null;

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
      {/* Header with Points */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text-dva">Tasks</h1>
            <p className="text-sm text-muted-foreground">Drag and drop to organize~ :3</p>
          </div>
          
          <div className="flex items-center gap-3 ml-4">
            <Card className="px-3 py-2 bg-neon-yellow/10 border-neon-yellow/30">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-neon-yellow" />
                <div>
                  <p className="text-xs text-muted-foreground">Earned</p>
                  <p className="text-lg font-bold text-neon-yellow">{totalEarnedPoints}</p>
                </div>
              </div>
            </Card>
            <Card className="px-3 py-2 bg-muted/20">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold">{totalPendingPoints}</p>
                </div>
              </div>
            </Card>
            {speedRunMode && (
              <Card className="px-3 py-2 bg-neon-cyan/10 border-neon-cyan/30 animate-pulse">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-neon-cyan" />
                  <div>
                    <p className="text-xs text-muted-foreground">Speed Run</p>
                    <p className="text-lg font-bold text-neon-cyan">{completedInSpeedRun} 🔥</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAchievements(!showAchievements)}
            className="border-neon-yellow text-neon-yellow hover:bg-neon-yellow/10"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Trophies
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="btn-neon-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)] max-w-lg">
              <DialogHeader>
                <DialogTitle className="gradient-text-dva">Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="What needs to be done?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Add details..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newTask.priority.toString()}
                      onValueChange={(v) => setNewTask({ ...newTask, priority: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((p) => (
                          <SelectItem key={p} value={p.toString()}>
                            {p === 1 ? 'Low' : p === 2 ? 'Low-Med' : p === 3 ? 'Medium' : p === 4 ? 'High' : 'Critical'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newTask.category}
                      onValueChange={(v) => setNewTask({ ...newTask, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="work">💼 Work</SelectItem>
                        <SelectItem value="personal">🏠 Personal</SelectItem>
                        <SelectItem value="health">💪 Health</SelectItem>
                        <SelectItem value="finance">💰 Finance</SelectItem>
                        <SelectItem value="social">👥 Social</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Time (min)</Label>
                    <Input
                      type="number"
                      value={newTask.estimatedMinutes}
                      onChange={(e) => setNewTask({ ...newTask, estimatedMinutes: e.target.value })}
                      placeholder="e.g., 30"
                    />
                  </div>
                </div>
                
                {/* Recurring Task Section */}
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={newTask.isRecurring}
                      onChange={(e) => setNewTask({ ...newTask, isRecurring: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="recurring" className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      Make this a recurring task
                    </Label>
                  </div>
                  
                  {newTask.isRecurring && (
                    <div className="space-y-3 pl-6">
                      <div className="space-y-2">
                        <Label>Repeat</Label>
                        <Select
                          value={newTask.recurrenceType}
                          onValueChange={(v) => setNewTask({ ...newTask, recurrenceType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {newTask.recurrenceType === 'weekly' && (
                        <div className="space-y-2">
                          <Label>On which days?</Label>
                          <div className="flex flex-wrap gap-2">
                            {DAYS.map((day) => (
                              <Button
                                key={day}
                                type="button"
                                variant={newTask.recurrenceDays.includes(day) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  const days = newTask.recurrenceDays.includes(day)
                                    ? newTask.recurrenceDays.filter(d => d !== day)
                                    : [...newTask.recurrenceDays, day];
                                  setNewTask({ ...newTask, recurrenceDays: days });
                                }}
                                className={newTask.recurrenceDays.includes(day) ? 'btn-neon-primary' : ''}
                              >
                                {day.slice(0, 3)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Link to Goal */}
                {goals.length > 0 && (
                  <div className="space-y-2">
                    <Label>Link to Goal (optional)</Label>
                    <Select
                      value={newTask.goalId}
                      onValueChange={(v) => setNewTask({ ...newTask, goalId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a goal..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {goals.filter(g => g.status === 'active').map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            {goal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <Button 
                  onClick={handleCreateTask} 
                  className="w-full btn-neon-primary"
                  disabled={!newTask.title.trim()}
                >
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Speed Run Mode Bar */}
      <div className="px-4 lg:px-6 pt-4">
        <SpeedRunMode
          isActive={speedRunMode}
          onStart={handleStartSpeedRun}
          onStop={handleStopSpeedRun}
          timer={speedRunTimer}
          completedCount={completedInSpeedRun}
          pointsEarned={pointsInSpeedRun}
          currentTask={currentSpeedRunTask}
          onCompleteTask={handleSpeedRunComplete}
        />
      </div>

      {/* Quick Add Bar */}
      <div className="px-4 lg:px-6 pt-4">
        <QuickAddBar onAddTask={onCreateTask} templates={templates} />
      </div>

      {/* Goal Stats Modal */}
      {showGoalStats && (
        <Dialog open={!!showGoalStats} onOpenChange={() => setShowGoalStats(null)}>
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)] max-w-md">
            <DialogHeader>
              <DialogTitle className="gradient-text-dva flex items-center gap-2">
                <Target className="w-5 h-5" />
                Goal Statistics
              </DialogTitle>
            </DialogHeader>
            {(() => {
              const goal = goals.find(g => g.id === showGoalStats);
              if (!goal) return null;
              
              const completionRate = goal.totalCompletions && (goal.totalCompletions + (goal.totalSkips || 0)) > 0
                ? Math.round((goal.totalCompletions / (goal.totalCompletions + (goal.totalSkips || 0))) * 100)
                : 0;
              
              return (
                <div className="space-y-4 py-4">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">{goal.title}</h3>
                    {goal.isRecurring && (
                      <Badge className="mt-1 bg-neon-purple/20 text-neon-purple">
                        <Repeat className="w-3 h-3 mr-1" />
                        Recurring {goal.recurrenceType}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-3 bg-green-500/10 border-green-500/30 text-center">
                      <CheckSquare className="w-6 h-6 mx-auto text-green-400" />
                      <p className="text-2xl font-bold text-green-400">{goal.totalCompletions || 0}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </Card>
                    <Card className="p-3 bg-yellow-500/10 border-yellow-500/30 text-center">
                      <SkipForward className="w-6 h-6 mx-auto text-yellow-400" />
                      <p className="text-2xl font-bold text-yellow-400">{goal.totalSkips || 0}</p>
                      <p className="text-xs text-muted-foreground">Skipped</p>
                    </Card>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Completion Rate</span>
                      <span className="font-bold">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-neon-green to-neon-cyan h-2 rounded-full transition-all"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-3 bg-neon-cyan/10 border-neon-cyan/30 text-center">
                      <Flame className="w-5 h-5 mx-auto text-neon-cyan" />
                      <p className="text-xl font-bold">{goal.currentStreak || 0}</p>
                      <p className="text-xs text-muted-foreground">Current Streak</p>
                    </Card>
                    <Card className="p-3 bg-neon-yellow/10 border-neon-yellow/30 text-center">
                      <Trophy className="w-5 h-5 mx-auto text-neon-yellow" />
                      <p className="text-xl font-bold">{goal.longestStreak || 0}</p>
                      <p className="text-xs text-muted-foreground">Longest Streak</p>
                    </Card>
                  </div>
                  
                  {goal.description && (
                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{goal.description}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] bg-[var(--bg-surface)] border-neon-yellow">
            <CardHeader className="border-b border-neon-yellow/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-neon-yellow" />
                  <CardTitle className="gradient-text-dva">Trophy Case</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAchievements(false)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-auto max-h-[60vh]">
              {achievements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No trophies yet! Click the trophy icon on completed tasks.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {achievements.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-card)] border border-neon-yellow/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neon-yellow/20 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-neon-yellow" />
                        </div>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-neon-yellow">+{task.points} points</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 p-4 lg:p-6 overflow-hidden">
        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 h-full">
            {COLUMNS.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
                formatDate={formatDate}
                onComplete={handleComplete}
                onSkip={handleSkip}
                onArchive={handleArchive}
                onDelete={onDeleteTask}
                onDuplicate={handleDuplicate}
                speedRunMode={speedRunMode}
              />
            ))}
          </div>
          
          <DragOverlay>
            {activeTask && (
              <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-neon-pink shadow-lg rotate-3 opacity-90">
                <p className="font-medium truncate">{activeTask.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`text-xs ${PRIORITY_COLORS[activeTask.priority]}`}>
                    P{activeTask.priority}
                  </Badge>
                  {activeTask.points > 0 && (
                    <Badge variant="outline" className="text-xs text-neon-yellow border-neon-yellow/30">
                      +{activeTask.points}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
