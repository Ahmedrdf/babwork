import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { isRegion, type RegionKey } from './regions';
import { isValidTimeZone } from './time';

/** The visitor's time zone and region, remembered in two preference cookies set by <RegionDetect>. */
export const getVisitor = cache(async (): Promise<{ tz: string | null; region: RegionKey | null }> => {
  const jar = await cookies();
  const raw = jar.get('rp_tz')?.value;
  const tz = raw ? decodeURIComponent(raw) : null;
  const region = jar.get('rp_region')?.value;
  return { tz: tz && isValidTimeZone(tz) ? tz : null, region: isRegion(region) ? region : null };
});
