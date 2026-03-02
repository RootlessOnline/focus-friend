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
  useDroppable,
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
  Archive,
  Trophy,
  Trash2,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'backlog' | 'doing' | 'done' | 'archived';
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
  { id: 'backlog', title: 'Backlog', color: 'border-l-status-backlog', bgColor: 'bg-[var(--status-backlog)]/10', icon: CheckSquare },
  { id: 'doing', title: 'Doing', color: 'border-l-status-doing', bgColor: 'bg-[var(--status-doing)]/10', icon: Clock },
  { id: 'done', title: 'Done', color: 'border-l-status-done', bgColor: 'bg-[var(--status-done)]/10', icon: Target },
  { id: 'archived', title: 'Archive', color: 'border-l-muted', bgColor: 'bg-muted/10', icon: Archive },
];

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  2: 'bg-green-500/20 text-green-400 border-green-500/30',
  3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  5: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Droppable column component
function DroppableColumn({ 
  column, 
  tasks, 
  formatDate, 
  PRIORITY_COLORS,
  onArchive,
  onAchievement,
  onDelete 
}: { 
  column: typeof COLUMNS[0];
  tasks: Task[];
  formatDate: (date: Date | string) => string;
  PRIORITY_COLORS: Record<number, string>;
  onArchive: (taskId: string) => void;
  onAchievement: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <Card className={`flex flex-col bg-[var(--bg-surface)] transition-all ${isOver ? 'ring-2 ring-neon-pink' : ''}`}>
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
      </CardHeader>
      <CardContent className="flex-1 p-2 overflow-hidden" ref={setNodeRef}>
        <ScrollArea className="h-full pr-2 min-h-[200px]">
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                formatDate={formatDate}
                PRIORITY_COLORS={PRIORITY_COLORS}
                onArchive={onArchive}
                onAchievement={onAchievement}
                onDelete={onDelete}
              />
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {column.id === 'done' ? 'Complete tasks will appear here~' : 
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

export function TasksView({ tasks, onCreateTask, onUpdateTask, onDeleteTask }: TasksViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [achievements, setAchievements] = useState<Task[]>([]);
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
      const newStatus = over.id as 'backlog' | 'doing' | 'done' | 'archived';
      
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

  const handleArchive = (taskId: string) => {
    onUpdateTask(taskId, { status: 'archived' });
  };

  const handleAchievement = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && !achievements.find(a => a.id === taskId)) {
      setAchievements(prev => [...prev, { ...task, status: 'done' }]);
    }
  };

  const handleDeleteAchievement = (taskId: string) => {
    setAchievements(prev => prev.filter(a => a.id !== taskId));
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAchievements(!showAchievements)}
            className="border-neon-yellow text-neon-yellow hover:bg-neon-yellow/10"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Achievements ({achievements.length})
          </Button>
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
      </div>

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] bg-[var(--bg-surface)] border-neon-yellow">
            <CardHeader className="border-b border-neon-yellow/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-neon-yellow" />
                  <CardTitle className="gradient-text-dva">My Achievements</CardTitle>
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
                  <p>No achievements yet! Click the trophy icon on completed tasks to add them here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {achievements.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-card)] border border-neon-yellow/20"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-neon-yellow" />
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.points > 0 && (
                            <p className="text-xs text-neon-yellow">+{task.points} points</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAchievement(task.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
            {COLUMNS.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
                formatDate={formatDate}
                PRIORITY_COLORS={PRIORITY_COLORS}
                onArchive={handleArchive}
                onAchievement={handleAchievement}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                formatDate={formatDate}
                PRIORITY_COLORS={PRIORITY_COLORS}
                isDragging
                onArchive={handleArchive}
                onAchievement={handleAchievement}
                onDelete={onDeleteTask}
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
  onArchive?: (taskId: string) => void;
  onAchievement?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

function TaskCard({ task, formatDate, PRIORITY_COLORS, isDragging, onArchive, onAchievement, onDelete }: TaskCardProps) {
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

      {/* Action buttons */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--border-subtle)]">
        {task.status === 'done' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-neon-yellow"
              onClick={(e) => { e.stopPropagation(); onAchievement?.(task.id); }}
            >
              <Trophy className="w-3 h-3 mr-1" />
              Trophy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); onArchive?.(task.id); }}
            >
              <Archive className="w-3 h-3 mr-1" />
              Archive
            </Button>
          </>
        )}
        {task.status === 'archived' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete?.(task.id); }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
