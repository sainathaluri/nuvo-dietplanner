import { WEEKDAYS } from '@/lib/clientPortal';
import { cn } from '@/lib/utils';

const SHORT_LABEL = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

export function DayTabs({ weekStart, selectedDay, onSelect }) {
  const start = weekStart ? new Date(weekStart) : null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Day of the week">
      {WEEKDAYS.map((day, index) => {
        const date = start ? new Date(start.getTime() + index * 24 * 60 * 60 * 1000) : null;
        const isActive = day === selectedDay;
        return (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(day)}
            className={cn(
              'shrink-0 rounded-xl px-3.5 py-2 text-center text-sm font-semibold transition-colors',
              isActive ? 'bg-forest text-white' : 'bg-cream text-forest hover:bg-sage/50'
            )}
          >
            {SHORT_LABEL[day]}
            {date && <><br /><small className="font-normal">{date.getDate()}</small></>}
          </button>
        );
      })}
    </div>
  );
}
