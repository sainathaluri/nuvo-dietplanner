import { formatInTimeZone } from 'date-fns-tz';
import { findUserById } from '../models/User.js';
import { sendEmail } from '../emails/sendEmail.js';
import { env } from '../config/env.js';

// No client-side timezone exists in this app (only a dietitian ever sets one — see
// users.timezone's comment in schema.sql) — the dietitian's own timezone is the only reliable
// IANA zone on hand, so every displayed time (to either party) is shown in it, labelled explicitly
// so it's never ambiguous which zone it is.
function formatMeetingTime(date, timezone) {
  return `${formatInTimeZone(date, timezone, 'EEEE, d MMM yyyy, h:mm a')} (${timezone})`;
}

const TEMPLATE_BY_EVENT = {
  booked: { client: 'call-scheduled', dietitian: 'call-scheduled-dietitian' },
  rescheduled: { client: 'call-rescheduled', dietitian: 'call-rescheduled-dietitian' },
  cancelled: { client: 'call-cancelled', dietitian: 'call-cancelled-dietitian' },
};

// One try/caught send per recipient — a failure sending to one party must never suppress the
// other, and neither may ever propagate out (see the caller, callService.js, for why: the booking/
// reschedule/cancellation itself has already succeeded by the time this runs).
async function trySend(to, templateKey, params, idempotencyKey, callId) {
  try {
    await sendEmail(to, templateKey, params, { idempotencyKey, relatedEntity: { type: 'appointment', id: callId } });
  } catch (err) {
    console.error(`[notifications] failed to queue ${templateKey} email to ${to} for call ${callId}:`, err);
  }
}

// event: 'booked' | 'rescheduled' | 'cancelled'. Sends TWO separate emails — one to the client (or,
// for a not-yet-converted follow-up, the enquiry's contact) and one to the dietitian — never one
// email addressed or CC'd to both. `previousScheduledAt` is required for 'rescheduled' (the
// template references {{previous_meeting_time}}) and ignored otherwise.
export async function notifyCallEvent(event, call, { previousScheduledAt } = {}) {
  const templates = TEMPLATE_BY_EVENT[event];
  const dietitian = await findUserById(call.dietitian?._id ?? call.dietitian).catch((err) => {
    console.error(`[notifications] could not resolve dietitian for call ${call.id}:`, err);
    return null;
  });
  if (!dietitian) return;

  const attendee = call.client
    ? await findUserById(call.client._id ?? call.client).catch(() => null)
    : call.enquiry
      ? { name: call.enquiry.name, email: call.enquiry.email }
      : null;

  const meetingLink = `${env.clientOrigin}/app/calls`;
  // The real Google Meet room when the dietitian has connected Google (services/callMeeting.js),
  // otherwise the portal page — always a usable destination, so the templates need no conditional
  // (renderTemplate.js is plain {{token}} substitution and throws on a missing key).
  const joinUrl = call.meetingUrl || meetingLink;
  const joinLabel = call.meetingUrl ? 'Join Google Meet' : 'View in Nourishly';
  const meetingTime = formatMeetingTime(call.scheduledAt, dietitian.timezone);
  const previousMeetingTime = previousScheduledAt ? formatMeetingTime(previousScheduledAt, dietitian.timezone) : undefined;

  const icsBase = {
    callId: call.id,
    sequence: call.icsSequence,
    summary: `Nourishly call with ${dietitian.name}`,
    // The join link goes in the description as well as `url`: calendar clients differ in which
    // one they surface, and Google Calendar in particular renders the description body but not
    // every event URL field.
    description: call.meetingUrl
      ? `Your call with ${dietitian.name} via Nourishly.

Join: ${call.meetingUrl}`
      : `Your call with ${dietitian.name} via Nourishly.`,
    url: joinUrl,
    start: call.scheduledAt,
    organizer: { name: dietitian.name, email: dietitian.email },
  };

  if (attendee) {
    await trySend(
      attendee.email,
      templates.client,
      {
        client_name: attendee.name,
        dietitian_name: dietitian.name,
        meeting_time: meetingTime,
        previous_meeting_time: previousMeetingTime,
        meeting_link: meetingLink,
        join_url: joinUrl,
        join_label: joinLabel,
        ics: { ...icsBase, attendee: { name: attendee.name, email: attendee.email } },
      },
      `${templates.client}:${call.id}:${call.icsSequence}:client`,
      call.id
    );
  }

  await trySend(
    dietitian.email,
    templates.dietitian,
    {
      client_name: attendee?.name ?? 'your client',
      dietitian_name: dietitian.name,
      meeting_time: meetingTime,
      previous_meeting_time: previousMeetingTime,
      meeting_link: meetingLink,
      join_url: joinUrl,
      join_label: joinLabel,
      ics: {
        ...icsBase,
        attendee: attendee ? { name: attendee.name, email: attendee.email } : { name: dietitian.name, email: dietitian.email },
      },
    },
    `${templates.dietitian}:${call.id}:${call.icsSequence}:dietitian`,
    call.id
  );
}
