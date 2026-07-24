"use client";

import React from "react";
import {
  Utensils,
  Briefcase,
  Building2,
  Scale,
  Building,
  Users,
  GraduationCap,
  HeartPulse,
  Film,
  HelpCircle,
  ShieldCheck,
  Hammer,
  ShoppingBag,
  Hotel,
  Car
} from "lucide-react";

interface BadgeProps {
  category?: string;
}

/**
 * Retourne l'icône Lucide correspondante à la macro-catégorie
 */
export function getCategoryIcon(category?: string, size = 16, className = "") {
  const cleanCat = category?.trim();

  switch (cleanCat) {
    case "Restauration & Café":
    case "Alimentation & Boulangerie":
      return <Utensils size={size} className={className} />;
    
    case "Industrie & Production":
      return <FactoryIcon size={size} className={className} />;
      
    case "Artisanat & Construction":
      return <Hammer size={size} className={className} />;
      
    case "Services aux Entreprises":
      return <Briefcase size={size} className={className} />;
      
    case "Finance & Juridique":
      return <Scale size={size} className={className} />;
      
    case "Immobilier":
      return <Building2 size={size} className={className} />;
      
    case "Tech & Télécom":
      return <ShieldCheck size={size} className={className} />;
      
    case "Administration & Secteur Public":
      return <Building size={size} className={className} />;
      
    case "Asbl & ONG":
      return <Users size={size} className={className} />;
      
    case "Éducation & Recherche":
      return <GraduationCap size={size} className={className} />;
      
    case "Santé":
      return <HeartPulse size={size} className={className} />;
      
    case "Culture & Loisirs":
      return <Film size={size} className={className} />;

    case "Commerce & Retail":
      return <ShoppingBag size={size} className={className} />;

    case "Hôtellerie & Tourisme":
      return <Hotel size={size} className={className} />;

    case "Transport & Logistique":
      return <Car size={size} className={className} />;

    default:
      return <HelpCircle size={size} className={className} />;
  }
}

/**
 * Composant pour afficher un badge coloré dynamique selon la catégorie
 */
export function CategoryBadge({ category }: BadgeProps) {
  const cleanCat = category?.trim() || "Autre";

  let colors = "bg-slate-100 text-slate-700 border-slate-200"; // Fallback "Autre"

  switch (cleanCat) {
    case "Restauration & Café":
    case "Alimentation & Boulangerie":
      colors = "bg-orange-50 text-orange-700 border-orange-200/60";
      break;
    case "Industrie & Production":
      colors = "bg-purple-50 text-purple-700 border-purple-200/60";
      break;
    case "Artisanat & Construction":
      colors = "bg-amber-50 text-amber-700 border-amber-200/60";
      break;
    case "Services aux Entreprises":
      colors = "bg-blue-50 text-blue-700 border-blue-200/60";
      break;
    case "Finance & Juridique":
      colors = "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      break;
    case "Immobilier":
      colors = "bg-indigo-50 text-indigo-700 border-indigo-200/60";
      break;
    case "Tech & Télécom":
      colors = "bg-cyan-50 text-cyan-700 border-cyan-200/60";
      break;
    case "Administration & Secteur Public":
      colors = "bg-neutral-100 text-neutral-800 border-neutral-300";
      break;
    case "Asbl & ONG":
      colors = "bg-teal-50 text-teal-700 border-teal-200/60";
      break;
    case "Éducation & Recherche":
      colors = "bg-violet-50 text-violet-700 border-violet-200/60";
      break;
    case "Santé":
      colors = "bg-rose-50 text-rose-700 border-rose-200/60";
      break;
    case "Culture & Loisirs":
      colors = "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/60";
      break;
    case "Commerce & Retail":
      colors = "bg-sky-50 text-sky-700 border-sky-200/60";
      break;
    case "Hôtellerie & Tourisme":
      colors = "bg-yellow-50 text-yellow-700 border-yellow-200/60";
      break;
    case "Transport & Logistique":
      colors = "bg-lime-50 text-lime-700 border-lime-200/60";
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${colors}`}>
      {getCategoryIcon(cleanCat, 12)}
      {cleanCat}
    </span>
  );
}

/**
 * Composant d'icône entourée d'un cercle coloré pour les listes et cartes
 */
export function CategoryIconCircle({ category }: BadgeProps) {
  const cleanCat = category?.trim() || "Autre";

  let circleBg = "bg-slate-100 text-slate-600";

  switch (cleanCat) {
    case "Restauration & Café":
    case "Alimentation & Boulangerie":
      circleBg = "bg-orange-100 text-orange-600";
      break;
    case "Industrie & Production":
      circleBg = "bg-purple-100 text-purple-600";
      break;
    case "Artisanat & Construction":
      circleBg = "bg-amber-100 text-amber-600";
      break;
    case "Services aux Entreprises":
      circleBg = "bg-blue-100 text-blue-600";
      break;
    case "Finance & Juridique":
      circleBg = "bg-emerald-100 text-emerald-600";
      break;
    case "Immobilier":
      circleBg = "bg-indigo-100 text-indigo-600";
      break;
    case "Tech & Télécom":
      circleBg = "bg-cyan-100 text-cyan-600";
      break;
    case "Administration & Secteur Public":
      circleBg = "bg-neutral-200 text-neutral-700";
      break;
    case "Asbl & ONG":
      circleBg = "bg-teal-100 text-teal-600";
      break;
    case "Éducation & Recherche":
      circleBg = "bg-violet-100 text-violet-600";
      break;
    case "Santé":
      circleBg = "bg-rose-100 text-rose-600";
      break;
    case "Culture & Loisirs":
      circleBg = "bg-fuchsia-100 text-fuchsia-600";
      break;
    case "Commerce & Retail":
      circleBg = "bg-sky-100 text-sky-600";
      break;
    case "Hôtellerie & Tourisme":
      circleBg = "bg-yellow-100 text-yellow-600";
      break;
    case "Transport & Logistique":
      circleBg = "bg-lime-100 text-lime-600";
      break;
  }

  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${circleBg}`}>
      {getCategoryIcon(cleanCat, 18)}
    </div>
  );
}

/**
 * Mini composant interne pour dessiner une usine propre si l'icône "Factory" standard n'est pas importée
 */
function FactoryIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M17 18h1" />
      <path d="M12 18h1" />
      <path d="M7 18h1" />
    </svg>
  );
}