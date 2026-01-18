import { createConsola } from 'consola';
import pc from 'picocolors';

export const logger = createConsola({
  reporters: [
    {
      log: (logObj) => {
        console.log(...logObj.args);
      },
    },
  ],
});

function getTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

async function getNetworkAddress() {
  try {
    const os = await import('node:os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {
    return 'localhost';
  }
  return 'localhost';
}

export function formatMethod(method: string) {
  const padded = method.padEnd(7, ' ');
  switch (method) {
    case 'GET':
      return pc.green(pc.bold(padded));
    case 'POST':
      return pc.yellow(pc.bold(padded));
    case 'PUT':
      return pc.blue(pc.bold(padded));
    case 'DELETE':
      return pc.red(pc.bold(padded));
    case 'PATCH':
      return pc.magenta(pc.bold(padded));
    case 'OPTIONS':
      return pc.cyan(pc.bold(padded));
    default:
      return pc.gray(padded);
  }
}

export function formatStatus(status: number) {
  const s = status.toString();
  if (status >= 500) return pc.red(s);
  if (status >= 400) return pc.yellow(s);
  if (status >= 300) return pc.cyan(s);
  if (status >= 200) return pc.green(s);
  return pc.white(s);
}

export function logRequest(method: string, path: string, status: number, duration: number) {
  const time = pc.gray(getTime().padEnd(10));
  const icon = '⚡';
  const methodStr = formatMethod(method);
  const statusStr = formatStatus(status);

  const durationRaw = `+${duration}ms`;
  let durationStr = durationRaw.padStart(7, ' ');

  if (duration > 500) durationStr = pc.red(durationStr);
  else if (duration > 100) durationStr = pc.yellow(durationStr);
  else durationStr = pc.gray(durationStr);

  const pathStr = pc.white(path);

  logger.log(` ${icon} ${time} ${methodStr} ${statusStr}  ${durationStr}   ${pathStr}`);
}

export function printRoutes(routes: Array<{ method: string; path: string }>) {
  console.log('');
  if (routes.length === 0) return;

  routes.forEach((route) => {
    const method = formatMethod(route.method);
    logger.log(`  ${pc.gray('+')} ${method} ${pc.white(route.path)}`);
  });

  console.log('');
}

export async function printStartup(port: number) {
  const ip = await getNetworkAddress();

  logger.log(pc.green(pc.bold('Server Started')));

  logger.log(`  ${pc.green('➜')}  ${pc.bold('Local:')}    ${pc.cyan(`http://localhost:${port}`)}`);
  if (ip !== 'localhost') {
    logger.log(`  ${pc.green('➜')}  ${pc.bold('Network:')}  ${pc.cyan(`http://${ip}:${port}`)}`);
  }

  console.log('');
}
