import { spawn } from 'node:child_process';

const schemaPath = 'prisma/schema.prisma';
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function maskDatabaseUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);

    if (parsed.password) {
      parsed.password = '******';
    }

    return parsed.toString();
  } catch {
    return '<invalid DATABASE_URL>';
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`,
        ),
      );
    });

    child.on('error', reject);
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required before running prisma migrate deploy',
    );
  }

  console.log(`[db:migrate:deploy] target=${maskDatabaseUrl(databaseUrl)}`);
  console.log('[db:migrate:deploy] applying pending migrations');
  await run(pnpmCommand, [
    '--filter',
    'api',
    'exec',
    'prisma',
    'migrate',
    'deploy',
    '--schema',
    schemaPath,
  ]);
}

main().catch((error) => {
  console.error('[db:migrate:deploy] failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
