import { openSync, readFileSync, writeFileSync, closeSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

/** PGlite's filesystem store must have only one process writing to it. */
export function lockPglite(dataDir: string): () => void {
  const lockPath = `${resolve(dataDir)}.lock`;
  mkdirSync(dirname(lockPath), { recursive: true });
  const owner = JSON.stringify({ pid: process.pid, token: randomUUID() });

  for (let attempt = 0; attempt < 3; attempt++) {
    let fd: number;
    try {
      fd = openSync(lockPath, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      let previous: string;
      try { previous = readFileSync(lockPath, 'utf8'); }
      catch (readError) {
        if ((readError as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw readError;
      }
      let pid: number;
      try { pid = JSON.parse(previous).pid; }
      catch { throw new Error(`PGlite lock is being initialized: ${lockPath}. Try again shortly.`); }
      if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error(`Invalid PGlite lock: ${lockPath}`);
      try {
        process.kill(pid, 0);
      } catch (probeError) {
        if ((probeError as NodeJS.ErrnoException).code === 'ESRCH') {
          // Reclaim an abandoned lock, but leave a replacement owner's lock alone.
          try { if (readFileSync(lockPath, 'utf8') === previous) unlinkSync(lockPath); }
          catch (readError) { if ((readError as NodeJS.ErrnoException).code !== 'ENOENT') throw readError; }
          continue;
        }
      }
      throw new Error(`Local database is already open in process ${pid}. Stop the other Babwork server or database script before using ${dataDir}.`);
    }
    try { writeFileSync(fd, owner); }
    finally { closeSync(fd); }
    return () => {
      try { if (readFileSync(lockPath, 'utf8') === owner) unlinkSync(lockPath); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    };
  }
  throw new Error(`Could not acquire PGlite lock: ${lockPath}`);
}
