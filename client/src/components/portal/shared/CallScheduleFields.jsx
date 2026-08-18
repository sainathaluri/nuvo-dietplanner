import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CALL_FREQUENCIES, CALL_REMINDER_OPTIONS, describeFrequency } from '@/lib/callScheduling';

// The "Repeat" + "Remind me" fields shared by CallFormDialog (client) and DietitianCallFormDialog
// — only shown when booking a new call, not when rescheduling an existing one.
export function CallScheduleFields({ control }) {
  return (
    <>
      <FormField
        control={control}
        name="frequency"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Repeat</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {CALL_FREQUENCIES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.value !== 'once' && (
              <FormDescription>
                The next call will be auto-scheduled at the same time, {describeFrequency(field.value)}. (Testing feature.)
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="reminderMinutesBefore"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Remind me</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {CALL_REMINDER_OPTIONS.map((opt) => (
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
    </>
  );
}
