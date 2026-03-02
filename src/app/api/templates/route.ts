import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEMO_USER_ID = 'demo-user';

export async function GET() {
  const templates = await db.taskTemplate.findMany({
    where: { userId: DEMO_USER_ID },
    orderBy: [{ isPinned: 'desc' }, { useCount: 'desc' }],
  });

  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const template = await db.taskTemplate.create({
    data: {
      userId: DEMO_USER_ID,
      title: body.title,
      description: body.description,
      priority: body.priority || 3,
      estimatedMinutes: body.estimatedMinutes,
      category: body.category,
      points: body.points || 15,
      goalId: body.goalId,
      icon: body.icon || '📋',
      isPinned: body.isPinned || false,
    },
  });

  return NextResponse.json(template);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  const template = await db.taskTemplate.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json(template);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await db.taskTemplate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
