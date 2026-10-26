// Runs the import: locally with `npm run ingest`, and every 3 hours in GitHub Actions (.github/workflows/ingest.yml).
// Needs only DATABASE_URL. One failing feed is reported in the output; the run fails only when every feed failed.
import 'dotenv/config';
import { ingestAll } from '../src/ingest/run';

ingestAll()
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    const allFailed = r.results.length > 0 && r.results.every((x) => 'error' in x);
    process.exit(allFailed ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
