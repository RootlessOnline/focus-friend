'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Target,
  Plus,
  Sparkles,
  CheckCircle,
  Calendar,
  Trophy,
  Flame,
  Star,
  Zap,
} from 'lucide-react';

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
}

interface GoalsViewProps {
  goals: Goal[];
  onCreateGoal: (goal: Partial<Goal>) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Goal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddTaskToGoal: (taskId: string, goalId: string) => void;
}

const ACHIEVEMENT_BADGES = [
  { icon: Star, name: 'First Step', color: 'text-neon-yellow', requirement: 1 },
  { icon: Flame, name: 'On Fire', color: 'text-neon-orange', requirement: 25 },
  { icon: Trophy, name: 'Halfway', color: 'text-neon-cyan', requirement: 50 },
  { icon: Zap, name: 'Almost There', color: 'text-neon-purple', requirement: 75 },
  { icon: CheckCircle, name: 'Complete', color: 'text-neon-green', requirement: 100 },
];

export function GoalsView({ goals, onCreateGoal, onUpdateGoal, onDeleteGoal, onAddTaskToGoal }: GoalsViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetValue: '',
    unit: '',
    targetDate: '',
  });

  const handleCreateGoal = () => {
    onCreateGoal({
      title: newGoal.title,
      description: newGoal.description,
      targetValue: newGoal.targetValue ? parseFloat(newGoal.targetValue) : undefined,
      unit: newGoal.unit || undefined,
      targetDate: newGoal.targetDate ? new Date(newGoal.targetDate) : undefined,
    });
    setNewGoal({ title: '', description: '', targetValue: '', unit: '', targetDate: '' });
    setIsCreateOpen(false);
  };

  const getProgress = (goal: Goal) => {
    if (goal.targetValue) {
      return Math.min((goal.currentValue / goal.targetValue) * 100, 100);
    }
    if (goal.tasks.length > 0) {
      const completed = goal.tasks.filter((t) => t.status === 'done').length;
      return (completed / goal.tasks.length) * 100;
    }
    return 0;
  };

  const getAchievementBadge = (progress: number) => {
    for (let i = ACHIEVEMENT_BADGES.length - 1; i >= 0; i--) {
      if (progress >= ACHIEVEMENT_BADGES[i].requirement) {
        return ACHIEVEMENT_BADGES[i];
      }
    }
    return null;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text-dva">Goals</h1>
          <p className="text-sm text-muted-foreground">Track your progress~ :3</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="btn-neon-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
            <DialogHeader>
              <DialogTitle className="gradient-text-dva">Create New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Goal Title</Label>
                <Input
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="What do you want to achieve?"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="Tell me more about it..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Value (optional)</Label>
                  <Input
                    type="number"
                    value={newGoal.targetValue}
                    onChange={(e) => setNewGoal({ ...newGoal, targetValue: e.target.value })}
                    placeholder="e.g., 100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit (optional)</Label>
                  <Input
                    value={newGoal.unit}
                    onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                    placeholder="e.g., pages, hours"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Date (optional)</Label>
                <Input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                />
              </div>
              <Button
                onClick={handleCreateGoal}
                className="w-full btn-neon-primary"
                disabled={!newGoal.title.trim()}
              >
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="neon-card hover-glow-pink">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neon-pink" />
              Active Goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-pink">{activeGoals.length}</div>
          </CardContent>
        </Card>

        <Card className="neon-card hover-glow-green">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-neon-green" />
              Completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-green">{completedGoals.length}</div>
          </CardContent>
        </Card>

        <Card className="neon-card hover-glow-yellow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neon-yellow" />
              Total Points
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-yellow">
              {goals.reduce((sum, g) => sum + (g.status === 'completed' ? g.points : 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Active Goals</h2>
        {activeGoals.length === 0 ? (
          <Card className="text-center py-12">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No active goals yet</p>
            <Button variant="link" onClick={() => setIsCreateOpen(true)}>
              Set your first goal!
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map((goal) => {
              const progress = getProgress(goal);
              const badge = getAchievementBadge(progress);
              const completedTasks = goal.tasks.filter((t) => t.status === 'done').length;

              return (
                <Card
                  key={goal.id}
                  className="neon-card hover-glow-purple cursor-pointer group"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      {badge && (
                        <badge.icon className={`w-5 h-5 ${badge.color}`} />
                      )}
                    </div>
                    {goal.description && (
                      <CardDescription className="line-clamp-2">
                        {goal.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold text-neon-cyan">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {goal.targetValue && (
                        <div>
                          {goal.currentValue} / {goal.targetValue} {goal.unit || ''}
                        </div>
                      )}
                      {goal.tasks.length > 0 && (
                        <div>
                          {completedTasks} / {goal.tasks.length} tasks
                        </div>
                      )}
                      {goal.targetDate && (
                        <div className="flex items-center gap-1 col-span-2">
                          <Calendar className="w-3 h-3" />
                          Due: {formatDate(goal.targetDate)}
                        </div>
                      )}
                    </div>

                    {/* Points */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center gap-1 text-sm text-neon-yellow">
                        <Sparkles className="w-4 h-4" />
                        {goal.points} points
                      </div>
                      {goal.tasks.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {goal.tasks.length} tasks
                        </Badge>
                      )}
                    </div>

                    {/* Linked Tasks Preview */}
                    {goal.tasks.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {goal.tasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 text-xs p-2 rounded bg-[var(--bg-surface)]"
                          >
                            {task.status === 'done' ? (
                              <CheckCircle className="w-3 h-3 text-neon-green" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-muted-foreground" />
                            )}
                            <span className={task.status === 'done' ? 'line-through text-muted-foreground' : ''}>
                              {task.title}
                            </span>
                          </div>
                        ))}
                        {goal.tasks.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{goal.tasks.length - 3} more tasks
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Completed Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGoals.map((goal) => (
              <Card
                key={goal.id}
                className="bg-[var(--bg-surface)] border-neon-green/30"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-neon-green" />
                    <CardTitle className="text-lg">{goal.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-neon-yellow">
                    <Trophy className="w-4 h-4" />
                    Earned {goal.points} points!
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
