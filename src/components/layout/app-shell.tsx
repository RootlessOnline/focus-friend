'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Home,
  MessageCircle,
  Calendar,
  Wallet,
  CheckSquare,
  Target,
  BookOpen,
  Users,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', view: null, icon: Home, color: 'text-neon-pink' },
  { name: 'AI Chat', href: '/', view: 'chat', icon: MessageCircle, color: 'text-neon-cyan' },
  { name: 'Calendar', href: '/', view: 'calendar', icon: Calendar, color: 'text-neon-purple' },
  { name: 'Finances', href: '/', view: 'finances', icon: Wallet, color: 'text-neon-green' },
  { name: 'Tasks', href: '/', view: 'tasks', icon: CheckSquare, color: 'text-neon-yellow' },
  { name: 'Goals', href: '/', view: 'goals', icon: Target, color: 'text-neon-orange' },
  { name: 'Bionic Reading', href: '/', view: 'bionic', icon: BookOpen, color: 'text-neon-cyan' },
  { name: 'People', href: '/', view: 'people', icon: Users, color: 'text-neon-purple' },
];

interface NavLinksProps {
  mobile?: boolean;
  currentView: string | null;
  onNavigate?: () => void;
}

function NavLinks({ mobile = false, currentView, onNavigate }: NavLinksProps) {
  return (
    <nav className={cn("flex flex-col gap-1", mobile ? "p-4" : "p-3")}>
      {/* Logo */}
      <Link 
        href="/" 
        className={cn(
          "flex items-center gap-3 px-3 py-4 mb-4",
          "hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors"
        )}
        onClick={onNavigate}
      >
        <div className="relative">
          <Sparkles className="w-8 h-8 text-neon-pink animate-pulse-neon" />
          <div className="absolute inset-0 blur-md bg-neon-pink/30 rounded-full" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg gradient-text-dva">Focus Friend</span>
          <span className="text-xs text-muted-foreground">ADHD Assistant :3</span>
        </div>
      </Link>

      {/* Navigation Links */}
      {navigation.map((item) => {
        const isActive = item.view === currentView || (!item.view && !currentView);
        
        return (
          <Link
            key={item.name}
            href={item.view ? `/?view=${item.view}` : '/'}
            onClick={() => {
              if (mobile && onNavigate) onNavigate();
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "hover:bg-[var(--bg-card-hover)] group",
              isActive && [
                "bg-[var(--bg-card)]",
                "border border-[var(--border-default)]",
                "shadow-[var(--glow-pink)]",
              ]
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              item.color,
              "group-hover:drop-shadow-[0_0_8px_currentColor]"
            )} />
            <span className={cn(
              "font-medium transition-colors",
              isActive ? "text-primary" : "text-foreground/80"
            )}>
              {item.name}
            </span>
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view');

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-darkest)]">
        <NavLinks currentView={currentView} />
        
        {/* Bottom section */}
        <div className="mt-auto p-4 border-t border-[var(--border-subtle)]">
          <div className="glass-card p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Need help?</p>
            <p className="text-xs text-muted-foreground/70">
              Just ask the AI chat! It can create tasks, events, and help you stay organized~ :3
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-[var(--bg-darkest)] border-r border-[var(--border-subtle)]">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
            <span className="font-bold text-lg gradient-text-dva">Focus Friend</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <NavLinks mobile currentView={currentView} onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-darkest)]">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-neon-pink" />
            <span className="font-bold gradient-text-dva">Focus Friend</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
