'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  AlertTriangle,
  Calendar,
  CreditCard,
  PiggyBank,
  ShoppingBag,
  Zap,
  Car,
  Heart,
  Gamepad2,
  Gift,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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

interface FinancesViewProps {
  data: {
    balance: number;
    transactions: Transaction[];
    pendingIncome: number;
    pendingExpenses: number;
    projectedBalance: number;
    warnings: string[];
  };
  onAddTransaction: (transaction: Partial<Transaction>) => void;
  onSetBalance: (amount: number) => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  income: PiggyBank,
  groceries: ShoppingBag,
  bills: Zap,
  entertainment: Gamepad2,
  transport: Car,
  health: Heart,
  shopping: ShoppingBag,
  subscription: CreditCard,
  gifts: Gift,
  uncategorized: Wallet,
};

const CATEGORY_COLORS: Record<string, string> = {
  income: 'var(--neon-green)',
  groceries: 'var(--neon-pink)',
  bills: 'var(--neon-yellow)',
  entertainment: 'var(--neon-purple)',
  transport: 'var(--neon-cyan)',
  health: 'var(--neon-red)',
  shopping: 'var(--neon-orange)',
  subscription: 'var(--neon-purple)',
  gifts: 'var(--neon-pink)',
  uncategorized: 'var(--text-muted)',
};

const CHART_COLORS = [
  '#FF69B4', '#00CED1', '#9370DB', '#FFD700', '#FF6347',
  '#32CD32', '#FF8C00', '#8A2BE2', '#00FA9A', '#DC143C'
];

export function FinancesView({ data, onAddTransaction, onSetBalance }: FinancesViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBalanceOpen, setIsBalanceOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    category: 'uncategorized',
    date: new Date().toISOString().split('T')[0],
  });
  const [setBalanceAmount, setSetBalanceAmount] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleAddTransaction = () => {
    const amount = parseFloat(newTransaction.amount);
    if (!isNaN(amount) && newTransaction.description.trim()) {
      onAddTransaction({
        amount,
        description: newTransaction.description,
        category: newTransaction.category,
        date: new Date(newTransaction.date),
      });
      setNewTransaction({
        amount: '',
        description: '',
        category: 'uncategorized',
        date: new Date().toISOString().split('T')[0],
      });
      setIsAddOpen(false);
    }
  };

  const handleSetBalance = () => {
    const amount = parseFloat(setBalanceAmount);
    if (!isNaN(amount)) {
      onSetBalance(amount);
      setSetBalanceAmount('');
      setIsBalanceOpen(false);
    }
  };

  // Calculate category totals for pie chart
  const categoryTotals = data.transactions.reduce((acc, t) => {
    if (t.amount < 0) {
      const cat = t.category || 'uncategorized';
      acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
    }
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
  }));

  // Prepare data for area chart (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  const chartData = last7Days.map((date) => {
    const dayTransactions = data.transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate.toDateString() === date.toDateString();
    });

    const income = dayTransactions
      .filter((t) => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = dayTransactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      income,
      expenses,
    };
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text-dva">Finances</h1>
          <p className="text-sm text-muted-foreground">Track your money~ :3</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBalanceOpen} onOpenChange={setIsBalanceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10">
                Set Balance
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
              <DialogHeader>
                <DialogTitle className="gradient-text-dva">Set Current Balance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Current Balance</Label>
                  <Input
                    type="number"
                    value={setBalanceAmount}
                    onChange={(e) => setSetBalanceAmount(e.target.value)}
                    placeholder="Enter your current balance"
                  />
                </div>
                <Button onClick={handleSetBalance} className="w-full btn-neon-primary">
                  Update Balance
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="btn-neon-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
              <DialogHeader>
                <DialogTitle className="gradient-text-dva">Add Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    placeholder="Use negative for expenses"
                  />
                  <p className="text-xs text-muted-foreground">Use negative numbers for expenses, positive for income</p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    placeholder="What's this for?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newTransaction.category}
                      onValueChange={(v) => setNewTransaction({ ...newTransaction, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CATEGORY_ICONS).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddTransaction} 
                  className="w-full btn-neon-primary"
                  disabled={!newTransaction.amount || !newTransaction.description.trim()}
                >
                  Add Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="glass-card p-4 rounded-lg border border-[var(--neon-orange)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-neon-orange flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-neon-orange">Financial Alerts</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                {data.warnings.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="neon-card hover-glow-cyan">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-neon-cyan" />
              Current Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.balance < 0 ? 'text-destructive' : 'text-neon-cyan'}`}>
              {formatCurrency(data.balance)}
            </div>
          </CardContent>
        </Card>

        <Card className="neon-card hover-glow-green">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neon-green" />
              Pending Income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-neon-green">
              +{formatCurrency(data.pendingIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="neon-card hover-glow-pink">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-neon-pink" />
              Pending Expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              -{formatCurrency(data.pendingExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="neon-card hover-glow-purple">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-neon-purple" />
              Projected Balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.projectedBalance < 0 ? 'text-destructive' : 'text-neon-purple'}`}>
              {formatCurrency(data.projectedBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Income vs Expenses (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--neon-green)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--neon-green)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--neon-pink)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--neon-pink)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="var(--neon-green)"
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="var(--neon-pink)"
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No expense data yet
                </div>
              )}
            </div>
            {pieData.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {pieData.map((entry, index) => (
                  <Badge key={entry.name} variant="outline" className="text-xs">
                    <span
                      className="w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    {entry.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
          <CardDescription>Click a transaction to see linked events or tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {data.transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <Button variant="link" onClick={() => setIsAddOpen(true)} className="mt-2">
                  Add your first transaction!
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {data.transactions.map((transaction) => {
                  const Icon = CATEGORY_ICONS[transaction.category] || Wallet;
                  const categoryColor = CATEGORY_COLORS[transaction.category] || 'var(--text-muted)';
                  
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${categoryColor}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: categoryColor }} />
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{transaction.category}</span>
                            {transaction.event && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {transaction.event.title}
                                </span>
                              </>
                            )}
                            {transaction.isRecurring && (
                              <Badge variant="outline" className="text-xs">Recurring</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount >= 0 ? 'text-neon-green' : 'text-destructive'}`}>
                          {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
