import { createServerInstance } from './lib/httpHandler.js';

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('TLS certificate verification must remain enabled.');
const port = Number(process.env.PORT) || 6285;
const { server, host } = createServerInstance({ port });
server.listen(port, host, () => {
  // Keep startup output free of credentials and paths beyond the local origin.
  process.stdout.write(`Plan Review Snapshot Billing Lite (Issue #5) listening on http://${host}:${port}/\n`);
});
server.on('error', (error) => {
  process.stderr.write(`Server error: ${error.code || 'ERROR'}\n`);
  process.exit(1);
});
