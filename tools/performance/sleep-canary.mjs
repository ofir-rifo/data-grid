import { spawn } from 'node:child_process';
import { writeFileSync, renameSync } from 'node:fs';

const [role, path] = process.argv.slice(2);
if (!['parent', 'grandchild', 'sentinel'].includes(role) || !path) throw new Error('Invalid canary role/path');
if (role === 'parent') {
  const child = spawn(process.execPath, [import.meta.filename, 'grandchild', path], { windowsHide: true, stdio: 'ignore' });
  child.on('error', error => { console.error(error); process.exitCode = 1; });
} else {
  writeFileSync(path + '.next', JSON.stringify({ pid: process.pid, ppid: process.ppid, role }));
  renameSync(path + '.next', path);
}
setTimeout(() => process.exit(0), 60000);
