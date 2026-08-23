import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { WEEKDAY_ORDER } from '@/lib/availability';
import { FREQUENCY_PRESETS } from '@/lib/consultationSchedule';

// Pure form fields, no submit logic of its own — bound to a react-hook-form `control` the caller
// owns. Used both by the Client Settings tab (ConsultationScheduleTab.jsx) and by both
// client-creation dialogs, so the fields themselves are never duplicated even though only the
// settings tab is the literal "one shared component" the edit-time requirement is about.
export function ConsultationScheduleFields({ control, watch, warning }) {
  const frequencyPreset = watch('frequencyPreset');

  return (
    <div className="grid gap-4">
      <FormField
        control={control}
        name="frequencyPreset"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Frequency</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {FREQUENCY_PRESETS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {frequencyPreset === 'custom' && (
        <FormField
          control={control}
          name="customFrequencyDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Every how many days?</FormLabel>
              <FormControl>
                <Input type="number" min="1" max="90" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name="preferredWeekday"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Preferred day</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {WEEKDAY_ORDER.map(({ weekday, label }) => (
                  <SelectItem key={weekday} value={String(weekday)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="preferredTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Default call time</FormLabel>
            <FormControl>
              <Input type="time" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="startDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="active"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Paused</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      {warning && (
        <p className="flex items-start gap-2 rounded-lg bg-peach/60 px-3 py-2 text-sm text-forest">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {warning}
        </p>
      )}
    </div>
  );
}
