# ADHD Assistant App - Architecture Document :3

## 🎮 App Overview
A comprehensive life management app designed for ADHD users with a D.Va/Jinx/Harley Quinn gamer aesthetic.

---

## 📊 Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?
  balance       Float     @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  tasks         Task[]
  goals         Goal[]
  events        Event[]
  transactions  Transaction[]
  people        Person[]
  chatMessages  ChatMessage[]
  settings      Settings?
}

model Task {
  id            String      @id @default(cuid())
  title         String
  description   String?
  status        TaskStatus  @default(BACKLOG)
  priority      Int         @default(5)  // 1-10, higher = more important
  points        Int         @default(0)  // Points earned when completed
  dueDate       DateTime?
  timeOfDay     TimeOfDay?  // MORNING, MIDDAY, EVENING
  isRepeating   Boolean     @default(false)
  repeatPattern String?     // cron-like pattern
  completedAt   DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  goal          Goal?       @relation(fields: [goalId], references: [id])
  goalId        String?
  transaction   Transaction? @relation(fields: [transactionId], references: [id])
  transactionId String?
  event         Event?      @relation(fields: [eventId], references: [id])
  eventId       String?
  people        Person[]    @relation("TaskPeople")
  user          User        @relation(fields: [userId], references: [id])
  userId        String
}

model Goal {
  id            String      @id @default(cuid())
  title         String
  description   String?
  targetPoints  Int         @default(100)
  currentPoints Int         @default(0)
  color         String?     // For UI styling
  icon          String?     // Emoji or icon name
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  tasks         Task[]
  user          User        @relation(fields: [userId], references: [id])
  userId        String
}

model Event {
  id            String        @id @default(cuid())
  title         String
  description   String?
  location      String?
  startDate     DateTime
  endDate       DateTime?
  isAllDay      Boolean       @default(false)
  isRepeating   Boolean       @default(false)
  repeatPattern String?
  timeOfDay     TimeOfDay?
  googleEventId String?       // Link to Google Calendar
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  transaction   Transaction?  @relation(fields: [transactionId], references: [id])
  transactionId String?
  task          Task?
  people        Person[]      @relation("EventPeople")
  user          User          @relation(fields: [userId], references: [id])
  userId        String
}

model Transaction {
  id              String          @id @default(cuid())
  title           String
  amount          Float
  type            TransactionType // INCOME, EXPENSE
  category        String?         // groceries, entertainment, bills, etc.
  isRecurring     Boolean         @default(false)
  recurringPeriod String?         // monthly, weekly, yearly
  nextDueDate     DateTime?       // For recurring payments
  paid            Boolean         @default(true)
  notes           String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  event           Event?          @relation(fields: [eventId], references: [id])
  eventId         String?
  task            Task?           @relation(fields: [taskId], references: [id])
  taskId          String?
  user            User            @relation(fields: [userId], references: [id])
  userId          String
}

model Person {
  id            String    @id @default(cuid())
  name          String
  nickname      String?
  relationship  String?   // friend, family, colleague
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  events        Event[]   @relation("EventPeople")
  tasks         Task[]    @relation("TaskPeople")
  user          User      @relation(fields: [userId], references: [id])
  userId        String
}

model ChatMessage {
  id          String    @id @default(cuid())
  role        String    // user, assistant
  content     String
  createdAt   DateTime  @default(now())
  
  user        User      @relation(fields: [userId], references: [id])
  userId      String
}

model Settings {
  id                    String  @id @default(cuid())
  monthlyIncome         Float   @default(0)
  monthlyExpenses       Float   @default(0)
  groceryBudget         Float   @default(200)
  emergencyFund         Float   @default(500)
  googleCalendarEnabled Boolean @default(false)
  theme                 String  @default("gamer")
  
  user                  User    @relation(fields: [userId], references: [id])
  userId                String  @unique
}

enum TaskStatus {
  BACKLOG
  DOING
  DONE
}

enum TimeOfDay {
  MORNING
  MIDDAY
  EVENING
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

---

## 🏗️ Component Architecture

### Layout Structure
```
app/
├── layout.tsx           # Main layout with sidebar
├── page.tsx             # Dashboard/Home
├── chat/
│   └── page.tsx         # AI Chat interface
├── calendar/
│   └── page.tsx         # Calendar view
├── finances/
│   └── page.tsx         # Finance tracker
├── tasks/
│   └── page.tsx         # Task board (kanban)
├── goals/
│   └── page.tsx         # Goals overview
├── bionic/
│   └── page.tsx         # PDF converter
├── people/
│   └── page.tsx         # People tracker
└── api/
    ├── chat/
    │   └── route.ts     # AI chat endpoint
    ├── calendar/
    │   └── route.ts     # Calendar operations
    ├── finances/
    │   └── route.ts     # Finance operations
    ├── tasks/
    │   └── route.ts     # Task operations
    ├── goals/
    │   └── route.ts     # Goal operations
    ├── bionic/
    │   └── route.ts     # PDF processing
    └── people/
        └── route.ts     # People operations
```

### Key Components
```
components/
├── ui/                  # shadcn/ui components
├── layout/
│   ├── Sidebar.tsx      # Navigation sidebar
│   └── Header.tsx       # Top header with user info
├── chat/
│   ├── ChatWindow.tsx   # Main chat interface
│   └── MessageBubble.tsx
├── calendar/
│   ├── CalendarView.tsx # Full calendar component
│   └── EventModal.tsx   # Add/edit events
├── finances/
│   ├── BalanceCard.tsx  # Current balance display
│   ├── TransactionList.tsx
│   ├── FinanceChart.tsx # Analytics charts
│   └── WarningBanner.tsx # Low balance warnings
├── tasks/
│   ├── KanbanBoard.tsx  # Backlog/Doing/Done
│   └── TaskCard.tsx
├── goals/
│   ├── GoalCard.tsx     # Progress bar + tasks
│   └── GoalProgress.tsx
├── bionic/
│   ├── PdfUpload.tsx    # File upload
│   └── PdfViewer.tsx    # Bionic reading view
└── shared/
    ├── PersonTag.tsx    # Person mention tag
    └── LinkIndicator.tsx # Shows connections
```

---

## 🤖 AI System Prompt Design

```
You are an ADHD-focused life assistant with a friendly, supportive personality. 
You help organize tasks, finances, goals, and events for a user who needs 
structure and encouragement.

Your personality:
- Friendly and warm, use ":3" occasionally when appropriate
- Supportive but honest about priorities
- Gamified language when discussing achievements
- Never judgmental about missed tasks

Available Actions:
1. CREATE_TASK: Create a new task (requires title, optional: dueDate, priority, goalId)
2. CREATE_GOAL: Create a new goal (requires title, optional: targetPoints, tasks)
3. CREATE_EVENT: Add to calendar (requires title, date/time, optional: location, people)
4. ADD_TRANSACTION: Record finance entry (requires amount, type, optional: category, linkedEvent)
5. UPDATE_BALANCE: Set current balance
6. GET_CALENDAR: Check calendar for specific dates
7. GET_FINANCES: Check financial status
8. GET_TASKS: Get current tasks by status
9. SUGGEST_SCHEDULE: Find best time slot for activity
10. CHECK_PRIORITY: Analyze task priorities

Priority Logic:
- Essential tasks (bills, groceries, appointments) = HIGH
- Work/study tasks = MEDIUM-HIGH
- Creative/hobby tasks = MEDIUM
- Optional/fun tasks = LOW

When asked to add something, ALWAYS:
1. Check for conflicts with existing items
2. Warn if financial implications exist
3. Suggest optimal timing if not specified
4. Ask for missing essential info politely

Response Format:
When performing actions, respond in JSON:
{
  "action": "CREATE_TASK",
  "data": { ... },
  "message": "Your friendly response :3"
}
```

---

## 🎨 Design System

### Color Palette (D.Va/Jinx/Harley Quinn Inspired)
```css
:root {
  /* Primary - D.Va Pink */
  --primary: #FF69B4;
  --primary-light: #FFB6C1;
  --primary-dark: #FF1493;
  
  /* Secondary - Jinx Blue/Cyan */
  --secondary: #00CED1;
  --secondary-light: #7FFFD4;
  
  /* Accent - Harley Purple */
  --accent: #9370DB;
  --accent-light: #BA55D3;
  
  /* Neon Glow Effects */
  --neon-pink: #FF10F0;
  --neon-cyan: #00FFFF;
  
  /* Backgrounds */
  --bg-dark: #0D0D1A;
  --bg-card: #1A1A2E;
  --bg-hover: #16213E;
  
  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A0A0B0;
  --text-muted: #6B6B7B;
  
  /* Status Colors */
  --success: #00FF7F;
  --warning: #FFD700;
  --danger: #FF4444;
}
```

### UI Elements
- Glassmorphism cards with subtle transparency
- Neon glow on hover states
- Rounded corners (16px default)
- Gradient borders on active items
- Pixel art style icons where appropriate
- Progress bars with gradient fills
- Achievement badges with sparkle effects

---

## 📱 PWA Configuration

```json
{
  "name": "Focus Friend - ADHD Assistant",
  "short_name": "FocusFriend",
  "description": "Your ADHD-friendly life organizer :3",
  "theme_color": "#FF69B4",
  "background_color": "#0D0D1A",
  "display": "standalone",
  "orientation": "portrait-primary",
  "icons": [...]
}
```

---

## 🔄 Implementation Phases

### Phase 1: Foundation
- Set up Next.js project with Prisma
- Create database schema
- Build basic UI layout with gamer aesthetic
- Implement authentication (simple local for now)

### Phase 2: Core Features
- AI Chat with basic actions
- Task management (CRUD)
- Finance tracking
- Basic calendar view

### Phase 3: Integration
- Google Calendar API integration
- Interconnected data system
- Smart scheduling logic
- People tracker

### Phase 4: Advanced
- Bionic Reading PDF converter
- Predictive finance warnings
- Achievement system
- Progress analytics

### Phase 5: Polish
- PWA optimization
- Mobile responsiveness testing
- Performance optimization
- User testing feedback

---

## 🔗 Interconnection Logic

```typescript
// When creating an event that costs money:
async function createEventWithCost(eventData, cost) {
  // 1. Create the event
  const event = await prisma.event.create({ data: eventData });
  
  // 2. Create linked transaction
  if (cost) {
    await prisma.transaction.create({
      data: {
        title: `Event: ${event.title}`,
        amount: cost,
        type: 'EXPENSE',
        eventId: event.id,
        userId: event.userId
      }
    });
  }
  
  // 3. Check if this impacts balance warnings
  const balance = await calculateBalance(event.userId);
  if (balance < settings.emergencyFund) {
    // Trigger warning
  }
  
  return event;
}

// When viewing transaction:
async function getTransactionContext(transactionId) {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      event: { include: { people: true } },
      task: true
    }
  });
  
  return {
    transaction: tx,
    relatedEvent: tx.event,
    relatedTask: tx.task,
    people: tx.event?.people || []
  };
}
```

---

## ✅ Test Scenarios

1. **Finance Check**: "Can I buy this €50 game today?"
   - System checks balance + upcoming expenses + grocery budget
   - Returns: "Hmm, with €100 balance and groceries needed (~€40), 
     plus your phone bill due in 3 days (€25), maybe wait until 
     after your income on the 15th? :3"

2. **Smart Scheduling**: "Remind me to call mom in a week"
   - System finds optimal free slot in next 7 days
   - Considers time of day preferences for calls

3. **Priority Check**: "I want to make a drawing"
   - System checks for urgent tasks
   - "That sounds fun! 🎨 But you have groceries to buy today. 
     Maybe make the drawing your reward after? :3"

4. **Event Creation**: "I'm going to the zoo with Sarah next Saturday"
   - Creates event + adds Sarah to people + asks about cost
   - Links everything together
