import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEMO_USER_ID = 'demo-user';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const goal = await db.goal.findUnique({
      where: { id },
      include: { tasks: true },
    });
    return NextResponse.json(goal);
  }

  const goals = await db.goal.findMany({
    where: { userId: DEMO_USER_ID },
    include: {
      tasks: { select: { id: true, title: true, status: true, points: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(goals);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const goal = await db.goal.create({
    data: {
      userId: DEMO_USER_ID,
      title: body.title,
      description: body.description,
      targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
      targetValue: body.targetValue,
      unit: body.unit,
      status: 'active',
      points: 100,
    },
    include: {
      tasks: true,
    },
  });

  return NextResponse.json(goal);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  const updateData: any = { ...updates };
  if (updates.targetDate) updateData.targetDate = new Date(updates.targetDate);
  if (updates.status === 'completed') updateData.completedAt = new Date();

  const goal = await db.goal.update({
    where: { id },
    data: updateData,
    include: { tasks: true },
  });

  return NextResponse.json(goal);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await db.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
