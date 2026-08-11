export function formatDate(value, opts) {
  return new Date(value).toLocaleDateString('en-US', opts ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(value) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

// For seeding a <input type="datetime-local"> value from a Date/ISO string, in local time.
export function toDatetimeLocalValue(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
