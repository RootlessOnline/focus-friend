import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEMO_USER_ID = 'demo-user';

export async function GET() {
  try {
    // Try to get or create demo user
    let user = await db.user.findUnique({
      where: { id: DEMO_USER_ID },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          id: DEMO_USER_ID,
          email: 'demo@focusfriend.app',
          name: 'Demo User',
          displayName: 'Gamer Friend',
          pronouns: 'she/her',
        },
      });
    }

    // Fetch all related data
    const [tasks, events, transactions, goals, people, documents, chatMessages] = await Promise.all([
      db.task.findMany({
        where: { userId: DEMO_USER_ID },
        include: { goal: { select: { title: true } } },
        orderBy: [{ status: 'asc' }, { priority: 'desc' }],
      }),
      db.event.findMany({
        where: { userId: DEMO_USER_ID },
        include: {
          people: { include: { person: true } },
          transactions: true,
        },
        orderBy: { startDate: 'asc' },
      }),
      db.transaction.findMany({
        where: { userId: DEMO_USER_ID },
        include: {
          event: { select: { title: true } },
          task: { select: { title: true } },
        },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      db.goal.findMany({
        where: { userId: DEMO_USER_ID },
        include: {
          tasks: { select: { id: true, title: true, status: true, points: true } },
        },
      }),
      db.person.findMany({
        where: { userId: DEMO_USER_ID },
        include: {
          events: { include: { event: { select: { id: true, title: true, startDate: true } } } },
        },
      }),
      db.pdfDocument.findMany({
        where: { userId: DEMO_USER_ID },
        orderBy: { createdAt: 'desc' },
      }),
      db.chatMessage.findMany({
        where: { userId: DEMO_USER_ID },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
    ]);

    // Calculate balance from transactions
    const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Generate warnings
    const warnings: string[] = [];
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Check for low balance
    if (balance < 50) {
      warnings.push('Balance is low! Consider budgeting~');
    }

    // Check for overdue tasks
    const overdueTasks = tasks.filter(
      t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    );
    if (overdueTasks.length > 0) {
      warnings.push(`You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}!`);
    }

    // Check for debts
    const activeDebts = await db.debt.findMany({
      where: { userId: DEMO_USER_ID, status: 'active' },
    });
    activeDebts.forEach(debt => {
      if (debt.dueDate && new Date(debt.dueDate) <= threeDaysFromNow) {
        warnings.push(`Debt "${debt.name}" is due soon!`);
      }
    });

    // Format messages for chat
    const messages = chatMessages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.createdAt,
      actions: m.actionsTaken ? JSON.parse(m.actionsTaken) : undefined,
    }));

    // Format people with events
    const formattedPeople = people.map(p => ({
      ...p,
      events: p.events.map(ep => ({
        id: ep.event.id,
        title: ep.event.title,
        startDate: ep.event.startDate,
      })),
    }));

    return NextResponse.json({
      tasks: tasks.map(t => ({
        ...t,
        dueDate: t.dueDate?.toISOString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      events: events.map(e => ({
        ...e,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString(),
        people: e.people.map(p => ({ name: p.person.name })),
        transactions: e.transactions.map(t => ({ amount: t.amount, description: t.description })),
      })),
      transactions: transactions.map(t => ({
        ...t,
        date: t.date.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
      goals: goals.map(g => ({
        ...g,
        targetDate: g.targetDate?.toISOString(),
        startDate: g.startDate?.toISOString(),
        completedAt: g.completedAt?.toISOString(),
      })),
      people: formattedPeople,
      documents,
      messages,
      balance,
      warnings,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: String(error) },
      { status: 500 }
    );
  }
}
