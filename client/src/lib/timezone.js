// Full IANA list when the runtime supports it (all evergreen browsers + Node 18+) — shared by
// TimezoneField.jsx (dietitian self-service) and the admin Edit Dietitian page's own timezone
// field, so the two never drift on which zones are offered.
export const TIMEZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];

// Spec §2026-round2-fixes item 7: "label the timezone in the UI" — a client viewing available
// slots needs to know which timezone the times are shown in (their own browser's), since the
// dietitian's configured hours are stored in a different zone entirely.
export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// "GMT+5:30" — a universally-renderable offset label, since not every IANA zone has a short
// abbreviation (IST/PST-style) in every locale's data, but every zone has a GMT offset.
export function timezoneOffsetLabel(timezone = browserTimezone(), date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}
