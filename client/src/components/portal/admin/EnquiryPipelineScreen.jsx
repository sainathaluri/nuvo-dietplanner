import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useEnquiries, useUpdateEnquiry } from '@/hooks/useEnquiries';
import { EnquiryColumn } from './EnquiryColumn';

const COLUMNS = [
  { status: 'new', label: 'New enquiry' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'follow-up', label: 'Follow-up' },
  { status: 'converted', label: 'Converted' },
  { status: 'closed', label: 'Closed' },
];

export function EnquiryPipelineScreen() {
  const { data, isLoading, isError, refetch } = useEnquiries();
  const updateEnquiry = useUpdateEnquiry();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));

  const enquiries = data?.enquiries ?? [];

  function moveTo(enquiryId, status) {
    updateEnquiry.mutate(
      { enquiryId, status },
      { onError: () => toast.error("That didn't save — please try again.") }
    );
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    const enquiry = active.data.current?.enquiry;
    if (!enquiry || enquiry.status === over.id) return;
    moveTo(enquiry._id, over.id);
  }

  return (
    <div className="mx-auto max-w-6xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">{enquiries.length} conversations in the pipeline</p>
        <h1 className="mt-1 text-3xl text-forest">Enquiry pipeline</h1>
        <p className="mt-1 text-muted-foreground">Drag a card — or use its dropdown — to keep every person feeling seen.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load enquiries"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : enquiries.length === 0 ? (
        <EmptyState icon={Inbox} title="No enquiries yet" description="New consultation requests from the website will show up here." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {COLUMNS.map(({ status, label }) => (
              <EnquiryColumn
                key={status}
                status={status}
                label={label}
                enquiries={enquiries.filter((e) => e.status === status)}
                pendingId={updateEnquiry.isPending ? updateEnquiry.variables?.enquiryId : null}
                onStatusChange={moveTo}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
