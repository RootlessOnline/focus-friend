'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Wallet,
  CheckSquare,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';

interface DashboardViewProps {
  data: {
    balance: number;
    upcomingEvents: any[];
    overdueTasks: any[];
    activeGoals: any[];
    recentTransactions: any[];
    warnings: string[];
  };
  onNavigate: (view: string) => void;
}

export function DashboardView({ data, onNavigate }: DashboardViewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            <span className="gradient-text-dva">Welcome back!</span> :3
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your life overview for today~
          </p>
        </div>
        <Button 
          onClick={() => onNavigate('chat')}
          className="btn-neon-primary flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Chat with AI
        </Button>
      </div>

      {/* Warning Banner */}
      {data.warnings.length > 0 && (
        <div className="glass-card p-4 rounded-lg border border-[var(--neon-orange)] animate-pulse-neon">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-neon-orange flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-neon-orange">Attention needed!</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                {data.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Balance Card */}
        <Card className="neon-card hover-glow-cyan">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-neon-cyan" />
              Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-cyan">
              {formatCurrency(data.balance)}
            </div>
            {data.balance < 50 && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Low balance warning!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tasks Card */}
        <Card className="neon-card hover-glow-pink">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-neon-pink" />
              Active Tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-pink">
              {data.overdueTasks.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              tasks need attention
            </p>
          </CardContent>
        </Card>

        {/* Events Card */}
        <Card className="neon-card hover-glow-purple">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neon-purple" />
              Upcoming
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-purple">
              {data.upcomingEvents.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              events this week
            </p>
          </CardContent>
        </Card>

        {/* Goals Card */}
        <Card className="neon-card hover-glow-green">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="w-4 h-4 text-neon-green" />
              Active Goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-green">
              {data.activeGoals.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              goals in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Column */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-neon-pink" />
              Tasks to Do
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('tasks')}>
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {data.overdueTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Sparkles className="w-8 h-8 text-neon-green mb-2" />
                  <p className="text-muted-foreground">All caught up! :3</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.overdueTasks.slice(0, 5).map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                        task.priority >= 4 ? "bg-destructive" :
                        task.priority >= 3 ? "bg-neon-yellow" : "bg-neon-cyan"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        {task.dueDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        task.status === 'doing' ? "border-neon-yellow text-neon-yellow" :
                        "border-muted-foreground text-muted-foreground"
                      )}>
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Events Column */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neon-purple" />
              Upcoming Events
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('calendar')}>
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {data.upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Calendar className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.upcomingEvents.slice(0, 5).map((event: any) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                    >
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0 bg-neon-purple" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(event.startDate)}
                          {event.preferredTime && ` • ${event.preferredTime}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Goals Column */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-neon-green" />
              Active Goals
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('goals')}>
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {data.activeGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Target className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No active goals yet</p>
                  <Button variant="link" size="sm" onClick={() => onNavigate('goals')} className="mt-2">
                    Create your first goal!
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.activeGoals.slice(0, 4).map((goal: any) => {
                    const progress = goal.targetValue 
                      ? (goal.currentValue / goal.targetValue) * 100 
                      : (goal.tasks?.filter((t: any) => t.status === 'done').length / (goal.tasks?.length || 1)) * 100;
                    
                    return (
                      <div
                        key={goal.id}
                        className="p-3 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium truncate">{goal.title}</p>
                          <span className="text-xs text-neon-green font-semibold">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        {goal.targetDate && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Due: {formatDate(goal.targetDate)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5 text-neon-cyan" />
            Recent Transactions
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('finances')}>
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            {data.recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Wallet className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.recentTransactions.slice(0, 6).map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {transaction.amount >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-neon-green" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">{transaction.category}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold",
                      transaction.amount >= 0 ? "text-neon-green" : "text-destructive"
                    )}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quick Chat */}
      <Card className="border-neon-cyan/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-cyan" />
            Quick Chat
          </CardTitle>
          <CardDescription>
            Ask me anything! I can help you create tasks, events, manage finances, and more~
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => onNavigate('chat')}
            className="w-full btn-neon-secondary"
          >
            Start chatting with Focus Friend :3
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function (duplicated for component local use)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
