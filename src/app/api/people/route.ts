import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEMO_USER_ID = 'demo-user';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const person = await db.person.findUnique({
      where: { id },
      include: {
        events: { include: { event: { select: { id: true, title: true, startDate: true } } } },
      },
    });
    return NextResponse.json(person);
  }

  const people = await db.person.findMany({
    where: { userId: DEMO_USER_ID },
    include: {
      events: { include: { event: { select: { id: true, title: true, startDate: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(people);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  const person = await db.person.create({
    data: {
      userId: DEMO_USER_ID,
      name: body.name,
      nickname: body.nickname,
      relationship: body.relationship,
      notes: body.notes,
      email: body.email,
      phone: body.phone,
      importantDates: body.importantDates ? JSON.stringify(body.importantDates) : undefined,
    },
  });

  return NextResponse.json(person);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (updates.importantDates) {
    updates.importantDates = JSON.stringify(updates.importantDates);
  }

  const person = await db.person.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json(person);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  await db.person.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
