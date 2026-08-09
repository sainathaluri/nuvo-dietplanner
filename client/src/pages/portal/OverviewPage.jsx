import { useAuth } from '@/hooks/useAuth';

export function OverviewPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-5xl p-9">
      <p className="font-display text-sage-deep">Good to see you, {user.name}.</p>
      <h1 className="text-3xl">Your {user.role} dashboard</h1>
      <p className="mt-2 text-muted">
        This view is scaffolded and wired to auth + routing. The real dashboard (meals, progress charts, client
        pipeline, etc. per role) is ported from <code>legacy/app.js</code> in a later phase.
      </p>
    </div>
  );
}
