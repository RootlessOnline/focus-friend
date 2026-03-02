'use client';

import { useState, useMemo } from 'react';
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
  Undo2,
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
  completedAt?: Date;
}

interface TasksViewProps {
  tasks: Task[];
  onCreateTask: (task: Partial<Task>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'border-l-status-backlog', icon: CheckSquare },
  { id: 'doing', title: 'Doing', color: 'border-l-status-doing', icon: Clock },
  { id: 'done', title: 'Done', color: 'border-l-status-done', icon: Target },
  { id: 'archived', title: 'Archive', color: 'border-l-muted', icon: Archive },
];

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  2: 'bg-green-500/20 text-green-400 border-green-500/30',
  3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  5: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Draggable Task Card Component
function DraggableTaskCard({ 
  task, 
  formatDate, 
  onComplete, 
  onArchive, 
  onDelete,
  onAchievement,
  isDragging = false 
}: { 
  task: Task;
  formatDate: (date: Date | string) => string;
  onComplete: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onAchievement: (taskId: string) => void;
  isDragging?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`
          p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]
          hover:border-neon-pink hover:shadow-[var(--glow-pink)] transition-all
          ${isDragging ? 'opacity-30' : ''}
        `}
        {...listeners}
        {...attributes}
      >
        {/* Click to open details */}
        <div 
          className="cursor-pointer"
          onClick={() => !isDragging && setShowDetails(true)}
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
            {task.points > 0 && (
              <Badge variant="outline" className="text-xs text-neon-yellow border-neon-yellow/30">
                <Sparkles className="w-3 h-3 mr-1" />
                +{task.points}
              </Badge>
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
          {task.status !== 'done' && task.status !== 'archived' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-neon-green hover:text-neon-green hover:bg-neon-green/10"
              onClick={() => onComplete(task.id)}
            >
              <CheckSquare className="w-3 h-3 mr-1" />
              Done
            </Button>
          )}
          {task.status === 'done' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-neon-yellow hover:text-neon-yellow"
                onClick={() => onAchievement(task.id)}
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

// Droppable Column Component
function DroppableColumn({ 
  column, 
  tasks, 
  formatDate, 
  onComplete,
  onArchive,
  onDelete,
  onAchievement,
}: { 
  column: typeof COLUMNS[0];
  tasks: Task[];
  formatDate: (date: Date | string) => string;
  onComplete: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onAchievement: (taskId: string) => void;
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
        {/* Show total points for done column */}
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
                onArchive={onArchive}
                onDelete={onDelete}
                onAchievement={onAchievement}
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

  // Calculate total earned points (from done tasks)
  const totalEarnedPoints = useMemo(() => {
    return tasks
      .filter(t => t.status === 'done')
      .reduce((sum, t) => sum + t.points, 0);
  }, [tasks]);

  // Calculate total pending points (from active tasks)
  const totalPendingPoints = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done' && t.status !== 'archived')
      .reduce((sum, t) => sum + t.points, 0);
  }, [tasks]);

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

    // Determine the target column
    let newStatus: 'backlog' | 'doing' | 'done' | 'archived' | null = null;
    
    // Check if dropped on a column directly
    if (COLUMNS.some(col => col.id === over.id)) {
      newStatus = over.id as 'backlog' | 'doing' | 'done' | 'archived';
    } else {
      // Dropped on a task - find which column that task is in
      const targetTask = tasks.find(t => t.id === over.id);
      if (targetTask && targetTask.status !== task.status) {
        newStatus = targetTask.status;
      }
    }

    // Update if status changed
    if (newStatus && task.status !== newStatus) {
      onUpdateTask(taskId, { 
        status: newStatus,
        ...(newStatus === 'done' ? { completedAt: new Date() } : {})
      });
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

  const handleComplete = (taskId: string) => {
    onUpdateTask(taskId, { 
      status: 'done',
      completedAt: new Date()
    });
  };

  const handleArchive = (taskId: string) => {
    onUpdateTask(taskId, { status: 'archived' });
  };

  const handleAchievement = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && !achievements.find(a => a.id === taskId)) {
      setAchievements(prev => [...prev, task]);
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
      {/* Header with Points Display */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text-dva">Tasks</h1>
            <p className="text-sm text-muted-foreground">Drag and drop to organize~ :3</p>
          </div>
          
          {/* Points Display */}
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
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAchievements(!showAchievements)}
            className="border-neon-yellow text-neon-yellow hover:bg-neon-yellow/10"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Trophies ({achievements.length})
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
                  <CardTitle className="gradient-text-dva">My Trophy Case</CardTitle>
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
                  <p>No trophies yet! Click the trophy icon on completed tasks to add them to your collection.</p>
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
                          <p className="text-xs text-neon-yellow">+{task.points} points earned</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAchievements(prev => prev.filter(a => a.id !== task.id))}
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
                onComplete={handleComplete}
                onArchive={handleArchive}
                onDelete={onDeleteTask}
                onAchievement={handleAchievement}
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
