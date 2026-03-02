'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users, Wallet, RefreshCw, Link, Unlink, AlertCircle, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  isAllDay?: boolean;
  preferredTime?: string;
  location?: string;
  status: string;
  transactions?: { amount: number; description: string }[];
  people?: { name: string }[];
}

interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  expired?: boolean;
  message?: string;
}

interface CalendarViewProps {
  events: Event[];
  onCreateEvent: (event: Partial<Event>) => void;
  onUpdateEvent: (eventId: string, updates: Partial<Event>) => void;
  onDeleteEvent: (eventId: string) => void;
  onSyncComplete?: () => void;
}

const TIME_PREFERENCES = ['morning', 'midday', 'evening', 'any'];

export function CalendarView({ events, onCreateEvent, onUpdateEvent, onDeleteEvent, onSyncComplete }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ imported: number; updated: number } | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    isAllDay: false,
    preferredTime: 'any',
    location: '',
    cost: '',
  });

  // Check Google Calendar connection status
  useEffect(() => {
    checkGoogleStatus();
  }, []);

  // Check for OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_success')) {
      setSyncResult({ imported: 0, updated: 0 });
      checkGoogleStatus();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('google_error')) {
      const error = params.get('google_error');
      console.error('Google connection error:', error);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkGoogleStatus = async () => {
    try {
      const response = await fetch('/api/google/status');
      const data = await response.json();
      setGoogleStatus(data);
    } catch (error) {
      console.error('Failed to check Google status:', error);
    }
  };

  const handleGoogleConnect = () => {
    window.location.href = '/api/google/connect';
  };

  const handleGoogleDisconnect = async () => {
    try {
      await fetch('/api/google/disconnect', { method: 'POST' });
      setGoogleStatus(prev => prev ? { ...prev, connected: false } : null);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/google/sync', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSyncResult({ imported: data.imported, updated: data.updated });
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        console.error('Sync failed:', data.error);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad days to start on Sunday
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, date);
    });
  };

  const handleCreateEvent = () => {
    const startDate = new Date(newEvent.startDate);
    if (!newEvent.isAllDay) {
      const [hours, minutes] = newEvent.startTime.split(':').map(Number);
      startDate.setHours(hours, minutes, 0, 0);
    }

    let endDate: Date | undefined;
    if (!newEvent.isAllDay && newEvent.endTime) {
      endDate = new Date(newEvent.startDate);
      const [hours, minutes] = newEvent.endTime.split(':').map(Number);
      endDate.setHours(hours, minutes, 0, 0);
    }

    onCreateEvent({
      title: newEvent.title,
      description: newEvent.description,
      startDate,
      endDate,
      isAllDay: newEvent.isAllDay,
      preferredTime: newEvent.preferredTime as any,
      location: newEvent.location || undefined,
    });

    setNewEvent({
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      isAllDay: false,
      preferredTime: 'any',
      location: '',
      cost: '',
    });
    setIsCreateOpen(false);
  };

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text-dva">Calendar</h1>
            <p className="text-sm text-muted-foreground">Plan your days~ :3</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Google Calendar Integration */}
          {googleStatus?.configured && (
            <div className="flex items-center gap-2 mr-2">
              {googleStatus.connected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="border-neon-green/50 text-neon-green hover:bg-neon-green/10"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Google'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleGoogleDisconnect}
                    title="Disconnect Google Calendar"
                    className="text-muted-foreground hover:text-neon-pink"
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGoogleConnect}
                  className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                >
                  <Link className="w-4 h-4 mr-2" />
                  Connect Google
                </Button>
              )}
            </div>
          )}

          {/* Sync Result Toast */}
          {syncResult && (
            <div className="fixed top-4 right-4 z-50 p-4 rounded-lg bg-neon-green/20 border border-neon-green text-neon-green flex items-center gap-2 shadow-lg">
              <CheckCircle className="w-5 h-5" />
              <span>
                Synced! {syncResult.imported} new, {syncResult.updated} updated
              </span>
              <button
                onClick={() => setSyncResult(null)}
                className="ml-2 hover:opacity-70"
              >
                ×
              </button>
            </div>
          )}

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="btn-neon-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)] max-w-md">
              <DialogHeader>
                <DialogTitle className="gradient-text-dva">Create Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="What's it about?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Preference</Label>
                    <Select
                      value={newEvent.preferredTime}
                      onValueChange={(v) => setNewEvent({ ...newEvent, preferredTime: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_PREFERENCES.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time.charAt(0).toUpperCase() + time.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={newEvent.isAllDay}
                    onChange={(e) => setNewEvent({ ...newEvent, isAllDay: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="allDay" className="font-normal">All day event</Label>
                </div>
                {!newEvent.isAllDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Location (optional)</Label>
                  <Input
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Where?"
                  />
                </div>
                <Button
                  onClick={handleCreateEvent}
                  className="w-full btn-neon-primary"
                  disabled={!newEvent.title.trim()}
                >
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Google Not Configured Warning */}
      {googleStatus && !googleStatus.configured && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-neon-yellow/10 border border-neon-yellow/30 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-neon-yellow" />
          <span className="text-neon-yellow">
            Google Calendar integration requires API credentials. Check your environment variables.
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }

              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    aspect-square p-1 border rounded-lg cursor-pointer transition-all
                    ${isSelected ? 'border-neon-pink shadow-[var(--glow-pink)]' : 'border-transparent'}
                    ${isCurrentDay ? 'bg-neon-pink/10 border-neon-pink' : ''}
                    ${isCurrentMonth ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-surface)] opacity-50'}
                    hover:border-neon-cyan hover:shadow-[var(--glow-cyan)]
                  `}
                >
                  <div className={`text-sm ${isCurrentDay ? 'font-bold text-neon-pink' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs truncate px-1 py-0.5 rounded bg-neon-purple/20 text-neon-purple"
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        <Card className="lg:w-80 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)]">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a day'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No events this day</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      if (selectedDate) {
                        setNewEvent({
                          ...newEvent,
                          startDate: format(selectedDate, 'yyyy-MM-dd'),
                        });
                        setIsCreateOpen(true);
                      }
                    }}
                  >
                    Add an event
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-neon-purple hover:shadow-[var(--glow-purple)] transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{event.title}</h4>
                        <Badge
                          variant="outline"
                          className={
                            event.status === 'confirmed'
                              ? 'border-neon-green text-neon-green'
                              : event.status === 'tentative'
                              ? 'border-neon-yellow text-neon-yellow'
                              : ''
                          }
                        >
                          {event.status}
                        </Badge>
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description.split('[google-id:')[0].trim()}
                        </p>
                      )}

                      <div className="mt-2 space-y-1">
                        {!event.isAllDay && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.startDate), 'h:mm a')}
                            {event.endDate && ` - ${format(new Date(event.endDate), 'h:mm a')}`}
                          </div>
                        )}

                        {event.location && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}

                        {event.preferredTime && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="w-3 h-3 text-center">☀️</span>
                            {event.preferredTime}
                          </div>
                        )}

                        {event.people && event.people.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {event.people.map((p) => p.name).join(', ')}
                          </div>
                        )}

                        {event.transactions && event.transactions.length > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Wallet className="w-3 h-3" />
                            {event.transactions.reduce((sum, t) => sum + t.amount, 0) < 0 ? '-' : '+'}$
                            {Math.abs(event.transactions.reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
