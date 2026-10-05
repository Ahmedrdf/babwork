// Run the import locally: npm run ingest
import 'dotenv/config';
import { ingestAll } from '../src/ingest/run';
ingestAll().then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0); });
