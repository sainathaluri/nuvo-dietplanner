import { useState } from 'react';
import { toast } from 'sonner';
import { FileText, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ReportFileViewer } from '@/components/portal/shared/ReportFileViewer';
import { useAddReportFeedback } from '@/hooks/useReports';
import { formatDate } from '@/lib/format';

export function DietitianReportCard({ report }) {
  const [message, setMessage] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const addFeedback = useAddReportFeedback();

  function submit(event) {
    event.preventDefault();
    if (!message.trim()) return;
    addFeedback.mutate(
      { reportId: report._id, message: message.trim() },
      {
        onSuccess: () => {
          toast.success('Feedback sent.');
          setMessage('');
        },
        onError: () => toast.error("We couldn't send that — please try again."),
      }
    );
  }

  return (
    <article className="rounded-card bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-forest">
            <FileText className="size-5" aria-hidden="true" />
          </div>
          <div>
            <strong className="block text-sm text-forest">{report.client?.name ?? 'Client'}</strong>
            <span className="text-xs text-muted-foreground">
              <button type="button" onClick={() => setViewerOpen(true)} className="font-semibold text-forest hover:underline">
                {report.fileName}
              </button>{' '}
              · Uploaded {formatDate(report.createdAt)}
            </span>
            {report.note && <p className="mt-1 text-sm text-forest">{report.note}</p>}
          </div>
        </div>
        <Badge variant={report.status === 'reviewed' ? 'secondary' : 'outline'} className="capitalize">
          {report.status}
        </Badge>
      </div>

      {report.feedback.length > 0 && (
        <div className="mt-4 grid gap-2 border-t border-line pt-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <MessageCircle className="size-3.5" aria-hidden="true" /> Feedback thread
          </p>
          {report.feedback.map((entry) => (
            <div key={entry._id} className="rounded-xl bg-sage/30 p-3">
              <div className="flex items-center justify-between">
                <strong className="text-sm text-forest">{entry.authorName}</strong>
                <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-forest">{entry.message}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-4 flex gap-2 border-t border-line pt-4">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add feedback for this client…"
          rows={1}
          className="min-h-9"
        />
        <Button type="submit" disabled={addFeedback.isPending || !message.trim()} className="shrink-0 rounded-full bg-coral text-white hover:bg-coral/90">
          {addFeedback.isPending ? 'Sending…' : 'Send'}
        </Button>
      </form>

      <ReportFileViewer report={report} open={viewerOpen} onOpenChange={setViewerOpen} />
    </article>
  );
}
