import {
  Code, Server, BrainCircuit, Palette, Compass, Bug, Headset, Handshake, Megaphone, PenLine,
  Landmark, Users, HeartPulse, GraduationCap, ClipboardList, Briefcase, type LucideIcon,
} from 'lucide-react';

type Tint = 'blue' | 'ochre' | 'terracotta' | 'olive';

// Each category keeps the same icon and colour everywhere, so the colour means something.
const STYLE: Record<string, { icon: LucideIcon; tint: Tint }> = {
  'Engineering': { icon: Code, tint: 'blue' },
  'DevOps & Infrastructure': { icon: Server, tint: 'blue' },
  'Data & AI': { icon: BrainCircuit, tint: 'olive' },
  'QA & Testing': { icon: Bug, tint: 'blue' },
  'Design': { icon: Palette, tint: 'ochre' },
  'Product': { icon: Compass, tint: 'olive' },
  'Customer Support': { icon: Headset, tint: 'terracotta' },
  'Sales': { icon: Handshake, tint: 'terracotta' },
  'Marketing': { icon: Megaphone, tint: 'ochre' },
  'Writing & Content': { icon: PenLine, tint: 'olive' },
  'Finance & Legal': { icon: Landmark, tint: 'ochre' },
  'HR & Recruiting': { icon: Users, tint: 'terracotta' },
  'Healthcare': { icon: HeartPulse, tint: 'terracotta' },
  'Education': { icon: GraduationCap, tint: 'ochre' },
  'Admin & Operations': { icon: ClipboardList, tint: 'olive' },
};

export function CategoryIcon({ category }: { category: string }) {
  const { icon: Icon, tint } = STYLE[category] ?? { icon: Briefcase, tint: 'blue' as Tint };
  return <span className={`tile-icon tint-${tint}`} aria-hidden="true"><Icon strokeWidth={2} /></span>;
}
