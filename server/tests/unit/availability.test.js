import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAvailability, CALL_DURATION_MINUTES } from '../../src/services/availability.js';

// Monday 2026-08-24, 09:00-17:00 UTC — a plain weekday template used by most cases below.
const MON_9_5 = [{ weekday: 1, startTime: '09:00', endTime: '17:00' }];

test('CALL_DURATION_MINUTES is the fixed 30-minute slot length', () => {
  assert.equal(CALL_DURATION_MINUTES, 30);
});

test('outside working hours: a slot before the weekday template opens is rejected', () => {
  const result = checkAvailability({
    workingHours: MON_9_5,
    requestedStart: '2026-08-24T08:30:00Z', // opens at 09:00
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'outside_hours');
});

test('outside working hours: a slot that runs past close is rejected', () => {
  const result = checkAvailability({
    workingHours: MON_9_5,
    requestedStart: '2026-08-24T16:45:00Z', // ends 17:15, template closes 17:00
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'outside_hours');
});

test('outside working hours: a weekday with no template row is closed', () => {
  const result = checkAvailability({
    workingHours: MON_9_5, // no Tuesday row
    requestedStart: '2026-08-25T10:00:00Z',
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'outside_hours');
});

test('inside working hours: a slot fully within the template succeeds', () => {
  const result = checkAvailability({
    workingHours: MON_9_5,
    requestedStart: '2026-08-24T10:00:00Z',
  });
  assert.deepEqual(result, { ok: true });
});

test('no weekly template configured at all is unrestricted (backward compatible)', () => {
  const result = checkAvailability({
    workingHours: [],
    requestedStart: '2026-08-24T23:00:00Z', // would be outside any normal template
  });
  assert.deepEqual(result, { ok: true });
});

test('an open exception grants hours outside the weekly template', () => {
  const result = checkAvailability({
    workingHours: MON_9_5, // no Saturday row -> normally closed
    exceptions: [{ startAt: '2026-08-22T10:00:00Z', endAt: '2026-08-22T14:00:00Z', kind: 'open' }],
    requestedStart: '2026-08-22T11:00:00Z', // Saturday, inside the open exception
  });
  assert.deepEqual(result, { ok: true });
});

test('blocked date: a closed exception spanning the whole day rejects any slot that day', () => {
  const result = checkAvailability({
    workingHours: MON_9_5,
    exceptions: [{ startAt: '2026-08-24T00:00:00Z', endAt: '2026-08-25T00:00:00Z', kind: 'closed', note: 'Day off' }],
    requestedStart: '2026-08-24T10:00:00Z',
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'blocked');
  assert.match(result.message, /Day off/);
});

test('blocked time: a closed exception for part of the day rejects only that window', () => {
  const exceptions = [{ startAt: '2026-08-24T12:00:00Z', endAt: '2026-08-24T13:00:00Z', kind: 'closed', note: 'Lunch' }];

  const duringLunch = checkAvailability({ workingHours: MON_9_5, exceptions, requestedStart: '2026-08-24T12:15:00Z' });
  assert.equal(duringLunch.ok, false);
  assert.equal(duringLunch.reason, 'blocked');

  const beforeLunch = checkAvailability({ workingHours: MON_9_5, exceptions, requestedStart: '2026-08-24T11:00:00Z' });
  assert.deepEqual(beforeLunch, { ok: true });
});

test('blocked holiday/personal period: a closed exception spanning multiple days blocks every day in it', () => {
  const exceptions = [{ startAt: '2026-08-24T00:00:00Z', endAt: '2026-08-27T00:00:00Z', kind: 'closed', note: 'Vacation' }];
  const middleDay = checkAvailability({
    workingHours: [{ weekday: 2, startTime: '09:00', endTime: '17:00' }],
    exceptions,
    requestedStart: '2026-08-25T10:00:00Z', // Tuesday, in the middle of the 3-day block
  });
  assert.equal(middleDay.ok, false);
  assert.equal(middleDay.reason, 'blocked');
});

test('a closed exception blocks a slot even inside an open exception (explicit blocks always win)', () => {
  const exceptions = [
    { startAt: '2026-08-22T09:00:00Z', endAt: '2026-08-22T17:00:00Z', kind: 'open' },
    { startAt: '2026-08-22T12:00:00Z', endAt: '2026-08-22T13:00:00Z', kind: 'closed', note: 'Personal' },
  ];
  const result = checkAvailability({ workingHours: [], exceptions, requestedStart: '2026-08-22T12:15:00Z' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'blocked');
});

test('overlapping appointment: a slot that overlaps an existing call is rejected', () => {
  const existingCalls = [{ id: 'call-1', scheduledAt: '2026-08-24T10:00:00Z' }]; // 10:00-10:30
  const result = checkAvailability({
    workingHours: MON_9_5,
    existingCalls,
    requestedStart: '2026-08-24T10:15:00Z', // overlaps 10:15-10:45 vs 10:00-10:30
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'overlap');
});

test('back-to-back appointments are allowed, not rejected as an overlap', () => {
  const existingCalls = [{ id: 'call-1', scheduledAt: '2026-08-24T10:00:00Z' }]; // 10:00-10:30

  const immediatelyAfter = checkAvailability({
    workingHours: MON_9_5,
    existingCalls,
    requestedStart: '2026-08-24T10:30:00Z', // starts exactly when the previous one ends
  });
  assert.deepEqual(immediatelyAfter, { ok: true });

  const immediatelyBefore = checkAvailability({
    workingHours: MON_9_5,
    existingCalls,
    requestedStart: '2026-08-24T09:30:00Z', // ends exactly when the existing one starts
  });
  assert.deepEqual(immediatelyBefore, { ok: true });
});
