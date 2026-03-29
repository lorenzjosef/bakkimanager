import { spawn } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const processes = [];

async function main() {
  const apiProcess = startProcess('api', ['yarn', 'workspace', '@bakki/api', 'dev']);
  processes.push(apiProcess);
  await waitForHttp('http://127.0.0.1:4175/v1/health');

  const webProcess = startProcess('web', [
    'yarn',
    'workspace',
    '@bakki/admin-web',
    'dev',
    '--host',
    '127.0.0.1',
    '--port',
    '5173',
  ]);
  processes.push(webProcess);
  await waitForHttp('http://127.0.0.1:5173');

  await runCommand(['yarn', 'workspace', '@bakki/admin-desktop', 'build']);

  const desktopProcess = startProcess(
    'desktop',
    ['yarn', 'workspace', '@bakki/admin-desktop', 'start'],
    {
      BAKKI_DESKTOP_API_BASE_URL: 'http://127.0.0.1:4175/v1',
      BAKKI_DESKTOP_START_URL: 'http://127.0.0.1:5173',
    },
  );
  processes.push(desktopProcess);

  await new Promise((resolve, reject) => {
    desktopProcess.on('exit', (code) => {
      if (code === 0) {
        resolve(null);
        return;
      }

      reject(new Error(`Desktop process exited with code ${code ?? 'unknown'}.`));
    });
  });
}

function startProcess(label, args, extraEnv = {}) {
  const child = spawn(args[0], args.slice(1), {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: 'pipe',
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });

  return child;
}

async function runCommand(args) {
  await new Promise((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      cwd: workspaceRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(null);
        return;
      }

      reject(new Error(`${args.join(' ')} exited with code ${code ?? 'unknown'}.`));
    });
  });
}

async function waitForHttp(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Wait and retry until the deadline expires.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function shutdownAll() {
  while (processes.length > 0) {
    const child = processes.pop();
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }
}

process.on('SIGINT', () => {
  shutdownAll();
  process.exit(130);
});

process.on('SIGTERM', () => {
  shutdownAll();
  process.exit(143);
});

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  shutdownAll();
  process.exit(1);
});
