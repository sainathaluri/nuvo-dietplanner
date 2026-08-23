import 'dotenv/config';

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mysqlUrl: required('MYSQL_URL', 'mysql://root:@127.0.0.1:3306/nourishly'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Not `required(...)`: an empty key must not crash the whole server on boot (every other route
  // still has to work without one configured) — utils/email.js throws a clear error at send time
  // instead, which forgotPassword's controller already catches and logs.
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Nourishly <onboarding@resend.dev>',
  passwordResetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 60),
  // Notification engine (server/src/emails/). emailTransport is left as whatever was configured
  // (or undefined) here — transport/index.js#resolveTransportKind is what actually enforces the
  // "never a real send outside production" rule; env.js just passes the raw setting through.
  emailTransport: process.env.EMAIL_TRANSPORT || '',
  emailQueuePollIntervalMs: Number(process.env.EMAIL_QUEUE_POLL_INTERVAL_MS || 5000),
  emailQueueBatchSize: Number(process.env.EMAIL_QUEUE_BATCH_SIZE || 10),
  emailMaxAttempts: Number(process.env.EMAIL_MAX_ATTEMPTS || 5),
  // Consultation schedule rolling-window generator (server/src/services/consultationScheduleJob.js).
  // Default 24h — the window is 60 days, so it never needs sub-daily freshness.
  consultationScheduleJobIntervalMs: Number(process.env.CONSULTATION_SCHEDULE_JOB_INTERVAL_MS || 24 * 60 * 60 * 1000),
};
