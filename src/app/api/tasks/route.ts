import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEMO_USER_ID = 'demo-user';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const task = await db.task.findUnique({
      where: { id },
      include: { goal: true, event: true, transactions: true },
    });
    return NextResponse.json(task);
  }

  const tasks = await db.task.findMany({
    where: { userId: DEMO_USER_ID },
    include: { goal: { select: { title: true } } },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const task = await db.task.create({
    data: {
      userId: DEMO_USER_ID,
      title: body.title,
      description: body.description,
      status: body.status || 'backlog',
      priority: body.priority || 3,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      estimatedMinutes: body.estimatedMinutes,
      goalId: body.goalId,
      eventId: body.eventId,
      points: (body.priority || 3) * 5,
    },
    include: { goal: { select: { title: true } } },
  });

  return NextResponse.json(task);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  const updateData: any = { ...updates };
  if (updates.dueDate) updateData.dueDate = new Date(updates.dueDate);
  if (updates.status === 'done') updateData.completedAt = new Date();

  const task = await db.task.update({
    where: { id },
    data: updateData,
    include: { goal: { select: { title: true } } },
  });

  return NextResponse.json(task);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await db.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
