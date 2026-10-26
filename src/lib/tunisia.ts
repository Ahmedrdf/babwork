/** Conservative location filter: a broad region or an unspecified "Remote" is not proof of eligibility. */
export const TUNISIA_LOCATION_PATTERN = '(^|[^[:alnum:]_])(tunisia|tunisie|tunis|تونس|worldwide|anywhere|global|monde entier)([^[:alnum:]_]|$)';
export function mentionsTunisiaOrWorldwide(location: string) {
  return /(^|[^\p{L}\p{N}_])(tunisia|tunisie|tunis|تونس|worldwide|anywhere|global|monde entier)([^\p{L}\p{N}_]|$)/iu.test(location);
}
