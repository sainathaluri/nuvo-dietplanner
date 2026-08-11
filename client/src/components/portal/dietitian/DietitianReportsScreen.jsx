import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useReports } from '@/hooks/useReports';
import { cn } from '@/lib/utils';
import { DietitianReportCard } from './DietitianReportCard';

const FILTERS = ['All', 'Pending', 'Reviewed'];

export function DietitianReportsScreen() {
  const { data, isLoading, isError, refetch } = useReports();
  const [filter, setFilter] = useState('All');

  const visible = (data ?? []).filter((r) => filter === 'All' || r.status === filter.toLowerCase());

  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">Keep every client feeling seen</p>
        <h1 className="mt-1 text-3xl text-forest">Report reviews</h1>
        <p className="mt-1 text-muted-foreground">Reports uploaded by your clients, newest first.</p>
      </div>

      <div className="mb-4 flex gap-1.5">
        {FILTERS.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilter(label)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold',
              filter === label ? 'bg-forest text-white' : 'bg-sage/40 text-forest hover:bg-sage/60'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load reports"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={FileText} title="Nothing here" description="Reports your clients upload will show up here." />
      ) : (
        <div className="grid gap-4">
          {visible.map((report) => (
            <DietitianReportCard key={report._id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
