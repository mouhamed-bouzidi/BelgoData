import {
  UtensilsCrossed,
  Croissant,
  Landmark,
  Briefcase,
  Scale,
  Building,
  Cpu,
  HeartHandshake,
  GraduationCap,
  HeartPulse,
  Building2,
  type LucideIcon,
} from "lucide-react";

interface CategoryConfig {
  icon: LucideIcon;
  color: string; // classes Tailwind bg + text
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  "Restauration & Café": { icon: UtensilsCrossed, color: "bg-orange-50 text-orange-600" },
  "Alimentation & Boulangerie": { icon: Croissant, color: "bg-amber-50 text-amber-600" },
  "Administration & Secteur Public": { icon: Landmark, color: "bg-slate-100 text-slate-600" },
  "Services aux Entreprises": { icon: Briefcase, color: "bg-purple-50 text-purple-600" },
  "Finance & Juridique": { icon: Scale, color: "bg-indigo-50 text-indigo-600" },
  Immobilier: { icon: Building, color: "bg-cyan-50 text-cyan-600" },
  "Tech & Télécom": { icon: Cpu, color: "bg-blue-50 text-blue-600" },
  "Asbl & ONG": { icon: HeartHandshake, color: "bg-pink-50 text-pink-600" },
  "Éducation & Recherche": { icon: GraduationCap, color: "bg-teal-50 text-teal-600" },
  Santé: { icon: HeartPulse, color: "bg-rose-50 text-rose-600" },
  Autre: { icon: Building2, color: "bg-gray-100 text-gray-500" },
};

export function getCategoryConfig(category: string | undefined | null): CategoryConfig {
  if (!category) return CATEGORY_CONFIG["Autre"];
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG["Autre"];
}

/** Petit composant prêt à l'emploi : icône + libellé dans un badge coloré */
export function CategoryBadge({ category }: { category: string | undefined | null }) {
  const { icon: Icon, color } = getCategoryConfig(category);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${color}`}>
      <Icon size={12} strokeWidth={2.2} />
      {category || "Autre"}
    </span>
  );
}

/** Icône ronde teintée selon la couleur du secteur (comme dans le design) */
export function CategoryIconCircle({ category }: { category: string | undefined | null }) {
  const { icon: Icon, color } = getCategoryConfig(category);
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${color}`}>
      <Icon size={15} strokeWidth={2.2} />
    </div>
  );
}