import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEMO_USER_ID = 'demo-user';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const event = await db.event.findUnique({
      where: { id },
      include: {
        people: { include: { person: true } },
        transactions: true,
        tasks: true,
      },
    });
    return NextResponse.json(event);
  }

  const events = await db.event.findMany({
    where: { userId: DEMO_USER_ID },
    include: {
      people: { include: { person: true } },
      transactions: true,
    },
    orderBy: { startDate: 'asc' },
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const event = await db.event.create({
    data: {
      userId: DEMO_USER_ID,
      title: body.title,
      description: body.description,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      isAllDay: body.isAllDay || false,
      preferredTime: body.preferredTime,
      location: body.location,
      status: 'confirmed',
    },
    include: {
      people: { include: { person: true } },
    },
  });

  // Handle cost
  if (body.cost && body.cost > 0) {
    await db.transaction.create({
      data: {
        userId: DEMO_USER_ID,
        amount: -body.cost,
        description: `Event: ${body.title}`,
        category: 'entertainment',
        eventId: event.id,
      },
    });
  }

  return NextResponse.json(event);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  const updateData: any = { ...updates };
  if (updates.startDate) updateData.startDate = new Date(updates.startDate);
  if (updates.endDate) updateData.endDate = new Date(updates.endDate);

  const event = await db.event.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(event);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await db.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
