/**
 * Map messy source categories ("dev", "exec", "All others", "Software Development"…) onto
 * one clean list used for browsing. Tries the source category first, then the title, then tags.
 */
const RULES: [string, RegExp][] = [
  ['Customer Support', /customer (service|support|success|experience)|\bsupport\b|help ?desk|call cent/i],
  ['DevOps & Infrastructure', /devops|\bsre\b|site reliab|infrastructure|sysadmin|platform eng|\bcloud\b|kubernetes|network eng/i],
  ['Data & AI', /\bdata\b|analytic|machine learning|\bml\b|\bai\b|\bllm\b|scientist|\bbi\b/i],
  ['QA & Testing', /\bqa\b|quality assurance|\btest(ing|er)?\b|automation eng/i],
  ['Design', /design|\bux\b|\bui\b|figma|illustrat|graphic|motion|video edit/i],
  ['Product', /product|project manag|program manag|scrum|delivery manag/i],
  ['Engineering', /engineer|develop|software|programm|\bdev\b|front[- ]?end|back[- ]?end|full[- ]?stack|golang|python|java|react|node|ruby|php|rust|\bios\b|android|mobile|\bweb\b|blockchain|security/i],
  ['Sales', /sales|account exec|business develop|\bsdr\b|\bbdr\b|partnership|alliances|account manag/i],
  ['Marketing', /marketing|\bseo\b|growth|social media|brand|\bppc\b|campaign|community/i],
  ['Writing & Content', /writ|editor|copy|content|translat|journalis/i],
  ['Finance & Legal', /financ|accounting|accountant|bookkeep|legal|lawyer|paralegal|compliance|\btax\b|payroll|audit/i],
  ['HR & Recruiting', /\bhr\b|human resource|recruit|talent|people (ops|partner)/i],
  ['Healthcare', /health|medical|nurs|therap|clinic|pharma|psycholog|counsel/i],
  ['Education', /teach|tutor|educat|instruct|curriculum|course/i],
  ['Admin & Operations', /admin|assistant|virtual assist|operations|office|data entry/i],
];

function match(text: string) {
  for (const [name, re] of RULES) if (re.test(text)) return name;
  return null;
}

export function normalizeCategory(raw: string, title: string, tags: string[] = []): string {
  return match(raw || '') || match(title || '') || match(tags.join(' ')) || 'Other';
}
