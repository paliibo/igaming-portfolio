'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarClock, Flag, Radio } from 'lucide-react';
import type { SportDto } from '@igaming/contracts';
import { PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from '@igaming/ui';
import { useEvents } from '@/lib/sportsbook';
import { EventList } from './event-list';

type Tab = 'upcoming' | 'live' | 'results';
const TABS: Tab[] = ['upcoming', 'live', 'results'];

export function EventsBrowser({
  sport,
  title,
  description,
}: {
  sport?: SportDto | null;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const tabParam = search.get('tab');
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'upcoming';
  const slug = sport?.slug;

  const upcoming = useEvents({ status: 'upcoming', sport: slug }, tab === 'upcoming');
  const live = useEvents({ status: 'live', sport: slug }, tab === 'live');
  const results = useEvents({ status: 'finished', sport: slug }, tab === 'results');

  const onTabChange = (next: string) => {
    const params = new URLSearchParams(search.toString());
    if (next === 'upcoming') params.delete('tab');
    else params.set('tab', next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const scheduledOnly = upcoming.data?.filter((e) => e.status === 'SCHEDULED');
  const sportLabel = sport ? sport.name.toLowerCase() : 'any sport';

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} />
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList aria-label="Event status">
          <TabsTrigger value="upcoming" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Upcoming
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-1.5">
            <Radio className="h-3.5 w-3.5" aria-hidden /> Live
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5">
            <Flag className="h-3.5 w-3.5" aria-hidden /> Results
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <EventList
            events={scheduledOnly}
            isLoading={upcoming.isLoading}
            error={upcoming.error}
            onRetry={() => void upcoming.refetch()}
            emptyTitle="No upcoming events"
            emptyDescription={`There are no scheduled fixtures for ${sportLabel} yet.`}
            groupByCompetition
            showSport={!sport}
          />
        </TabsContent>
        <TabsContent value="live">
          <EventList
            events={live.data}
            isLoading={live.isLoading}
            error={live.error}
            onRetry={() => void live.refetch()}
            emptyIcon={Radio}
            emptyTitle="Nothing in play"
            emptyDescription={`No ${sportLabel} events are live at the moment.`}
            groupByCompetition
            showSport={!sport}
          />
        </TabsContent>
        <TabsContent value="results">
          <EventList
            events={results.data}
            isLoading={results.isLoading}
            error={results.error}
            onRetry={() => void results.refetch()}
            emptyIcon={Flag}
            emptyTitle="No results yet"
            emptyDescription={`Finished and settled ${sportLabel} events will be listed here.`}
            groupByCompetition
            showSport={!sport}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
