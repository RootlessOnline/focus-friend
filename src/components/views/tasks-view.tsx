'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  CheckSquare,
  Clock,
  Target,
  GripVertical,
  Calendar,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'backlog' | 'doing' | 'done';
  priority: number;
  dueDate?: Date;
  estimatedMinutes?: number;
  points: number;
  goalId?: string;
  goal?: { title: string };
}

interface TasksViewProps {
  tasks: Task[];
  onCreateTask: (task: Partial<Task>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'border-l-status-backlog', bgColor: 'bg-[var(--status-backlog)]/10' },
  { id: 'doing', title: 'Doing', color: 'border-l-status-doing', bgColor: 'bg-[var(--status-doing)]/10' },
  { id: 'done', title: 'Done', color: 'border-l-status-done', bgColor: 'bg-[var(--status-done)]/10' },
];

const PRIORITY_COLORS: Record<number, string> = {
  1: 'priority-low',
  2: 'priority-low',
  3: 'priority-medium',
  4: 'priority-high',
  5: 'priority-critical',
};

export function TasksView({ tasks, onCreateTask, onUpdateTask, onDeleteTask }: TasksViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 3,
    dueDate: '',
    estimatedMinutes: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (over) {
      const taskId = active.id as string;
      const newStatus = over.id as 'backlog' | 'doing' | 'done';
      
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        onUpdateTask(taskId, { 
          status: newStatus,
          ...(newStatus === 'done' ? { completedAt: new Date() } : {})
        });
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
    });
    setNewTask({ title: '', description: '', priority: 3, dueDate: '', estimatedMinutes: '' });
    setIsCreateOpen(false);
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="text-2xl font-bold gradient-text-dva">Tasks</h1>
          <p className="text-sm text-muted-foreground">Drag and drop to organize~ :3</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="btn-neon-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
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
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estimated Time (minutes)</Label>
                <Input
                  type="number"
                  value={newTask.estimatedMinutes}
                  onChange={(e) => setNewTask({ ...newTask, estimatedMinutes: e.target.value })}
                  placeholder="e.g., 30"
                />
              </div>
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

      {/* Kanban Board */}
      <div className="flex-1 p-4 lg:p-6 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            {COLUMNS.map((column) => (
              <Card key={column.id} className="flex flex-col bg-[var(--bg-surface)]">
                <CardHeader className={`p-4 ${column.color} border-l-4`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{column.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {getTasksByStatus(column.id).length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-2 overflow-hidden">
                  <ScrollArea className="h-full pr-2">
                    <div className="space-y-2">
                      {getTasksByStatus(column.id).map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          formatDate={formatDate}
                          PRIORITY_COLORS={PRIORITY_COLORS}
                        />
                      ))}
                      {getTasksByStatus(column.id).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {column.id === 'done' ? 'Complete tasks will appear here~' : 'Drag tasks here or create new ones!'}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
                <div
                  className="h-32 border-t border-dashed border-[var(--border-subtle)] m-2 rounded-lg flex items-center justify-center text-muted-foreground text-sm"
                  id={column.id}
                >
                  Drop here
                </div>
              </Card>
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                formatDate={formatDate}
                PRIORITY_COLORS={PRIORITY_COLORS}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  formatDate: (date: Date | string) => string;
  PRIORITY_COLORS: Record<number, string>;
  isDragging?: boolean;
}

function TaskCard({ task, formatDate, PRIORITY_COLORS, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]
        hover:border-neon-pink hover:shadow-[var(--glow-pink)] transition-all cursor-grab
        ${isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{task.title}</p>
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
      </div>

      {task.goal && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Target className="w-3 h-3" />
          {task.goal.title}
        </div>
      )}

      {task.points > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-neon-yellow">
          <Sparkles className="w-3 h-3" />
          +{task.points} points
        </div>
      )}
    </div>
  );
}
