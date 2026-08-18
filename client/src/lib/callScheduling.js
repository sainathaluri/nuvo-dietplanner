// Shared by the booking dialogs (client + dietitian) and useCallReminders — options for the
// testing-stage auto-scheduling/reminder feature (see server/src/jobs/callScheduler.js).

export const CALL_FREQUENCIES = [
  { value: 'once', label: "Doesn't repeat" },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const FREQUENCY_DESCRIPTIONS = {
  daily: 'every day',
  weekly: 'every week',
  biweekly: 'every 2 weeks',
  monthly: 'every month',
};

export function describeFrequency(value) {
  return FREQUENCY_DESCRIPTIONS[value] ?? '';
}

export const CALL_REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '10', label: '10 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
];

// react-hook-form fields are always strings — these convert to/from the API's
// number-or-null `reminderMinutesBefore`.
export function reminderValueToMinutes(value) {
  return value === 'none' || !value ? null : Number(value);
}

export function reminderMinutesToValue(minutes) {
  return minutes === null || minutes === undefined ? 'none' : String(minutes);
}
