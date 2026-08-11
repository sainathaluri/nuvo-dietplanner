import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { WeightTrendChart } from './WeightTrendChart';

export function ProgressSnapshotCard({ stats, isLoading }) {
  return (
    <section className="rounded-card bg-white p-6 shadow-soft min-[900px]:col-span-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Your steady progress</h2>
        {stats && (
          <strong className={stats.weightChangeTotal <= 0 ? 'text-sage-deep' : 'text-coral'}>
            {stats.weightChangeTotal > 0 ? '+' : ''}
            {stats.weightChangeTotal.toFixed(1)} kg
          </strong>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-36 w-full" />
      ) : stats ? (
        <>
          <div className="mt-2">
            <WeightTrendChart data={stats.sorted} />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Small steps, real change.</span>
            <Link to="/app/progress" className="font-semibold text-forest hover:underline">
              View my progress →
            </Link>
          </div>
        </>
      ) : (
        <EmptyState
          title="No progress logged yet"
          description="Log your first weight check-in to start seeing your trend here."
          action={
            <Link to="/app/progress" className="text-sm font-semibold text-coral hover:underline">
              Log progress →
            </Link>
          }
        />
      )}
    </section>
  );
}
