import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEMO_USER_ID = 'demo-user';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const goal = await db.goal.findUnique({
      where: { id },
      include: { 
        tasks: { select: { id: true, title: true, status: true, points: true } },
        progress: { 
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
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
      
      // Recurring goal fields
      isRecurring: body.isRecurring || false,
      recurrenceType: body.recurrenceType,
      recurrenceDays: body.recurrenceDays,
      preferredTime: body.preferredTime,
      
      // Initialize stats
      totalCompletions: 0,
      totalSkips: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
    include: {
      tasks: true,
    },
  });

  // If it's a recurring goal, create the first task
  if (body.isRecurring && body.recurrenceType) {
    await createRecurringTask(goal.id, body, DEMO_USER_ID);
  }

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

// Helper to create the first task for a recurring goal
async function createRecurringTask(goalId: string, goalData: any, userId: string) {
  const today = new Date();
  const points = (goalData.priority || 3) * 5;
  
  // Find the next occurrence based on recurrence type
  let taskDate = new Date();
  
  if (goalData.recurrenceType === 'daily') {
    taskDate.setDate(today.getDate() + 1);
  } else if (goalData.recurrenceType === 'weekly') {
    // Get the days array from JSON
    const days = goalData.recurrenceDays ? JSON.parse(goalData.recurrenceDays) : [];
    if (days.length > 0) {
      // Find next day that matches
      const dayMap: Record<string, number> = { 
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
        thursday: 4, friday: 5, saturday: 6 
      };
      const todayDay = today.getDay();
      let minDiff = 7;
      
      for (const day of days) {
        const targetDay = dayMap[day.toLowerCase()];
        let diff = targetDay - todayDay;
        if (diff <= 0) diff += 7;
        if (diff < minDiff) minDiff = diff;
      }
      
      taskDate.setDate(today.getDate() + minDiff);
    }
  } else if (goalData.recurrenceType === 'monthly') {
    taskDate.setMonth(today.getMonth() + 1);
  }
  
  // Create the task
  await db.task.create({
    data: {
      userId,
      goalId,
      title: goalData.title,
      description: goalData.description,
      status: 'backlog',
      priority: goalData.priority || 3,
      dueDate: taskDate,
      points,
      isRecurringInstance: true,
      recurringTaskDate: taskDate,
    },
  });
  
  // Create the goal progress entry
  await db.goalProgress.create({
    data: {
      goalId,
      userId,
      date: taskDate,
      status: 'pending',
    },
  });
}
