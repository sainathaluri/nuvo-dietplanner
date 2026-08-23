import { app } from './src/app.js';
import { connectDb } from './src/config/db.js';
import { env } from './src/config/env.js';
import { assertEmailTransportConfigured } from './src/emails/transport/index.js';
import { startEmailWorker } from './src/emails/worker.js';
import { startConsultationScheduleJob } from './src/services/consultationScheduleJob.js';

async function main() {
  // Fails loudly here, before the server accepts any traffic, if EMAIL_TRANSPORT/RESEND_API_KEY
  // isn't valid for this NODE_ENV — see src/emails/transport/index.js.
  assertEmailTransportConfigured();
  await connectDb();
  startEmailWorker();
  startConsultationScheduleJob();
  app.listen(env.port, () => console.log(`[server] listening on http://localhost:${env.port}`));
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
