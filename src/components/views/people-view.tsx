'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  Users,
  Plus,
  Calendar,
  Heart,
  Briefcase,
  User,
  Mail,
  Phone,
  Clock,
  Gift,
  MessageCircle,
} from 'lucide-react';

interface Person {
  id: string;
  name: string;
  nickname?: string;
  relationship?: string;
  notes?: string;
  email?: string;
  phone?: string;
  lastContactDate?: Date;
  importantDates?: Array<{ type: string; date: string }>;
  events?: Array<{ id: string; title: string; startDate: Date }>;
}

interface PeopleViewProps {
  people: Person[];
  onCreatePerson: (person: Partial<Person>) => void;
  onUpdatePerson: (personId: string, updates: Partial<Person>) => void;
  onDeletePerson: (personId: string) => void;
}

const RELATIONSHIP_ICONS: Record<string, any> = {
  friend: Heart,
  family: Users,
  partner: Heart,
  colleague: Briefcase,
  other: User,
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  friend: 'text-neon-pink',
  family: 'text-neon-purple',
  partner: 'text-neon-red',
  colleague: 'text-neon-cyan',
  other: 'text-muted-foreground',
};

export function PeopleView({ people, onCreatePerson, onUpdatePerson, onDeletePerson }: PeopleViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [newPerson, setNewPerson] = useState({
    name: '',
    nickname: '',
    relationship: 'friend',
    notes: '',
    email: '',
    phone: '',
  });

  const handleCreatePerson = () => {
    onCreatePerson({
      name: newPerson.name,
      nickname: newPerson.nickname || undefined,
      relationship: newPerson.relationship,
      notes: newPerson.notes || undefined,
      email: newPerson.email || undefined,
      phone: newPerson.phone || undefined,
    });
    setNewPerson({
      name: '',
      nickname: '',
      relationship: 'friend',
      notes: '',
      email: '',
      phone: '',
    });
    setIsCreateOpen(false);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getDaysSinceContact = (date?: Date) => {
    if (!date) return null;
    const now = new Date();
    const last = new Date(date);
    const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Group people by relationship
  const groupedPeople = people.reduce((acc, person) => {
    const rel = person.relationship || 'other';
    if (!acc[rel]) acc[rel] = [];
    acc[rel].push(person);
    return acc;
  }, {} as Record<string, Person[]>);

  // People with upcoming important dates
  const upcomingDates = people
    .filter((p) => p.importantDates && p.importantDates.length > 0)
    .flatMap((p) =>
      p.importantDates!.map((d) => ({
        person: p,
        dateType: d.type,
        date: new Date(d.date),
      }))
    )
    .filter((d) => {
      const now = new Date();
      const date = d.date;
      return date.getMonth() === now.getMonth() && date.getDate() >= now.getDate();
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text-dva">People</h1>
          <p className="text-sm text-muted-foreground">Remember the important folks~ :3</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="btn-neon-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Person
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
            <DialogHeader>
              <DialogTitle className="gradient-text-dva">Add New Person</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newPerson.name}
                  onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
                  placeholder="Their name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nickname (optional)</Label>
                  <Input
                    value={newPerson.nickname}
                    onChange={(e) => setNewPerson({ ...newPerson, nickname: e.target.value })}
                    placeholder="What you call them"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select
                    value={newPerson.relationship}
                    onValueChange={(v) => setNewPerson({ ...newPerson, relationship: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email (optional)</Label>
                  <Input
                    type="email"
                    value={newPerson.email}
                    onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <Input
                    type="tel"
                    value={newPerson.phone}
                    onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={newPerson.notes}
                  onChange={(e) => setNewPerson({ ...newPerson, notes: e.target.value })}
                  placeholder="Anything to remember about them..."
                />
              </div>
              <Button
                onClick={handleCreatePerson}
                className="w-full btn-neon-primary"
                disabled={!newPerson.name.trim()}
              >
                Add Person
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Upcoming Important Dates */}
      {upcomingDates.length > 0 && (
        <Card className="glass-card border-neon-pink/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="w-5 h-5 text-neon-pink" />
              Upcoming Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {upcomingDates.slice(0, 5).map((item, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-card)]"
                >
                  <Avatar className="w-8 h-8 bg-neon-purple">
                    <AvatarFallback className="text-xs">
                      {getInitials(item.person.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{item.person.nickname || item.person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.dateType}: {formatDate(item.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* People List */}
      {people.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">No people added yet</p>
          <Button variant="link" onClick={() => setIsCreateOpen(true)}>
            Add someone important!
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.map((person) => {
            const Icon = RELATIONSHIP_ICONS[person.relationship || 'other'] || User;
            const colorClass = RELATIONSHIP_COLORS[person.relationship || 'other'] || '';
            const daysSinceContact = getDaysSinceContact(person.lastContactDate);

            return (
              <Card
                key={person.id}
                className="neon-card hover-glow-purple cursor-pointer group"
                onClick={() => setSelectedPerson(person)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 bg-gradient-to-br from-neon-pink to-neon-purple">
                      <AvatarFallback>
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {person.nickname || person.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Icon className={`w-3 h-3 ${colorClass}`} />
                        {person.relationship}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Last Contact */}
                  {daysSinceContact !== null && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="w-3 h-3" />
                      {daysSinceContact === 0
                        ? 'Talked today!'
                        : daysSinceContact === 1
                        ? 'Talked yesterday'
                        : `${daysSinceContact} days since last contact`}
                    </div>
                  )}

                  {/* Notes */}
                  {person.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {person.notes}
                    </p>
                  )}

                  {/* Contact Info */}
                  {(person.email || person.phone) && (
                    <div className="flex gap-2 mt-2">
                      {person.email && (
                        <Badge variant="outline" className="text-xs">
                          <Mail className="w-3 h-3 mr-1" />
                          Email
                        </Badge>
                      )}
                      {person.phone && (
                        <Badge variant="outline" className="text-xs">
                          <Phone className="w-3 h-3 mr-1" />
                          Phone
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Events Count */}
                  {person.events && person.events.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Calendar className="w-3 h-3" />
                      {person.events.length} shared event{person.events.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Person Detail Modal */}
      <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border-default)] max-w-md">
          {selectedPerson && (
            <>
              <DialogHeader>
                <DialogTitle className="gradient-text-dva">
                  {selectedPerson.nickname || selectedPerson.name}
                </DialogTitle>
                <CardDescription>
                  {selectedPerson.relationship}
                </CardDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-center">
                  <Avatar className="w-20 h-20 bg-gradient-to-br from-neon-pink to-neon-purple">
                    <AvatarFallback className="text-2xl">
                      {getInitials(selectedPerson.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {selectedPerson.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{selectedPerson.notes}</p>
                  </div>
                )}

                {selectedPerson.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${selectedPerson.email}`} className="text-sm text-neon-cyan hover:underline">
                      {selectedPerson.email}
                    </a>
                  </div>
                )}

                {selectedPerson.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${selectedPerson.phone}`} className="text-sm text-neon-cyan hover:underline">
                      {selectedPerson.phone}
                    </a>
                  </div>
                )}

                {selectedPerson.importantDates && selectedPerson.importantDates.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Important Dates</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedPerson.importantDates.map((d, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <Gift className="w-3 h-3 mr-1 text-neon-pink" />
                          {d.type}: {formatDate(d.date)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPerson.events && selectedPerson.events.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Shared Events</Label>
                    <ScrollArea className="h-32 mt-2">
                      <div className="space-y-2">
                        {selectedPerson.events.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center gap-2 p-2 rounded bg-[var(--bg-surface)]"
                          >
                            <Calendar className="w-4 h-4 text-neon-purple" />
                            <div>
                              <p className="text-sm font-medium">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(event.startDate)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // Would open chat with context about this person
                    }}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Ask AI
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      onDeletePerson(selectedPerson.id);
                      setSelectedPerson(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
