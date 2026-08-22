import { app } from './src/app.js';
import { connectDb } from './src/config/db.js';
import { env } from './src/config/env.js';

async function main() {
  await connectDb();
  app.listen(env.port, () => console.log(`[server] listening on http://localhost:${env.port}`));
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});
