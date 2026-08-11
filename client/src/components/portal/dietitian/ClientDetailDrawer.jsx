import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentPlan } from '@/hooks/usePlans';
import { useProgress } from '@/hooks/useProgress';
import { useCalls } from '@/hooks/useCalls';
import { useReports } from '@/hooks/useReports';
import { getNextCall } from '@/lib/clientPortal';
import { formatDate, formatDateTime } from '@/lib/format';

export function ClientDetailDrawer({ client, onOpenChange }) {
  const open = Boolean(client);
  const planQuery = useCurrentPlan(client?._id ?? null);
  const progressQuery = useProgress(client?._id ?? null);
  const callsQuery = useCalls(client?._id ?? null);
  const reportsQuery = useReports(client?._id ?? null);

  const latestProgress = progressQuery.data?.[progressQuery.data.length - 1];
  const nextCall = getNextCall(callsQuery.data);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {client && (
          <>
            <SheetHeader>
              <SheetTitle>{client.name}</SheetTitle>
              <SheetDescription>
                {client.email}
                {client.phone ? ` · ${client.phone}` : ''}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 px-4 pb-4">
              <section>
                <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Current plan</h3>
                {planQuery.isLoading ? (
                  <Skeleton className="mt-2 h-10 w-full" />
                ) : planQuery.plan ? (
                  <div className="mt-2 rounded-xl bg-cream p-3">
                    <strong className="block text-sm text-forest">{planQuery.plan.title}</strong>
                    <span className="text-xs text-muted-foreground">
                      Week of {formatDate(planQuery.plan.week)} · {planQuery.plan.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No plan yet.</p>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Latest progress</h3>
                {progressQuery.isLoading ? (
                  <Skeleton className="mt-2 h-10 w-full" />
                ) : latestProgress ? (
                  <div className="mt-2 rounded-xl bg-cream p-3">
                    <strong className="block text-sm text-forest">{latestProgress.weight} kg</strong>
                    <span className="text-xs text-muted-foreground">Logged {formatDate(latestProgress.date)}</span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No progress logged yet.</p>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Next call</h3>
                {callsQuery.isLoading ? (
                  <Skeleton className="mt-2 h-10 w-full" />
                ) : nextCall ? (
                  <div className="mt-2 rounded-xl bg-cream p-3">
                    <strong className="block text-sm text-forest">{formatDateTime(nextCall.scheduledAt)}</strong>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No call scheduled.</p>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Recent reports</h3>
                {reportsQuery.isLoading ? (
                  <Skeleton className="mt-2 h-10 w-full" />
                ) : reportsQuery.data?.length ? (
                  <div className="mt-2 grid gap-2">
                    {reportsQuery.data.slice(0, 3).map((report) => (
                      <div key={report._id} className="rounded-xl bg-cream p-3">
                        <strong className="block text-sm text-forest">{report.fileName}</strong>
                        <span className="text-xs text-muted-foreground capitalize">
                          {report.status} · {formatDate(report.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No reports uploaded yet.</p>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
