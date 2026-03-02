import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEMO_USER_ID = 'demo-user';

export async function GET(request: NextRequest) {
  const transactions = await db.transaction.findMany({
    where: { userId: DEMO_USER_ID },
    include: {
      event: { select: { title: true } },
      task: { select: { title: true } },
    },
    orderBy: { date: 'desc' },
    take: 100,
  });

  const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({ transactions, balance });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const transaction = await db.transaction.create({
    data: {
      userId: DEMO_USER_ID,
      amount: body.amount,
      description: body.description,
      category: body.category || 'uncategorized',
      date: body.date ? new Date(body.date) : new Date(),
      eventId: body.eventId,
      taskId: body.taskId,
      recurrenceRule: body.recurring ? 'FREQ=MONTHLY' : undefined,
    },
    include: {
      event: { select: { title: true } },
      task: { select: { title: true } },
    },
  });

  return NextResponse.json(transaction);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (body.balance !== undefined) {
    // Set balance by creating adjustment transaction
    const currentBalance = await db.transaction.aggregate({
      where: { userId: DEMO_USER_ID },
      _sum: { amount: true },
    });

    const adjustment = body.balance - (currentBalance._sum.amount || 0);

    await db.transaction.create({
      data: {
        userId: DEMO_USER_ID,
        amount: adjustment,
        description: 'Balance adjustment',
        category: 'income',
      },
    });

    return NextResponse.json({ balance: body.balance });
  }

  return NextResponse.json({ error: 'No action specified' }, { status: 400 });
}
