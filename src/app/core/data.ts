export type Mode = 'presentiel' | 'distance';

export interface Pkg {
  id: string;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  badge?: boolean;
}

export interface PayMethod {
  id: string;
  label: string;
  kind: string;
}

/** Créneaux de 1h30 avec 15 min de pause. */
export const TIMES = [
  '09:00 – 10:30',
  '10:45 – 12:15',
  '12:30 – 14:00',
  '14:15 – 15:45',
  '16:00 – 17:30',
  '17:45 – 19:15',
];

export const DOWS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export const COUNTRIES = [
  'Togo', 'Bénin', "Côte d'Ivoire", 'Sénégal', 'Ghana', 'Nigeria', 'Cameroun',
  'Burkina Faso', 'Mali', 'Niger', 'Gabon', 'RD Congo', 'Kenya', 'Maroc',
];

export const PACKAGES: Pkg[] = [
  {
    id: 'standard', name: 'Standard', price: 15000,
    tagline: "Ton live de 1h30, l'essentiel.",
    features: ['Live de 1h30', 'Enregistrement du live', 'Replay envoyé sous 48 h'],
  },
  {
    id: 'boost', name: 'Boost', price: 20000, badge: true,
    tagline: 'Ton live annoncé sur les réseaux OCD.',
    features: ['Tout le pack Standard', 'Annonce sur les réseaux OCD', 'Affiche personnalisée de ton live'],
  },
  {
    id: 'premium', name: 'Premium', price: 45000,
    tagline: 'La visibilité maximale, avec Bovan.',
    features: ['Tout le pack Boost', 'Bovan annonce ton live sur son compte', 'Mise en avant le jour J'],
  },
];

export const PAYMENTS: PayMethod[] = [
  { id: 'tmoney', label: 'T-Money', kind: 'Mobile money' },
  { id: 'flooz', label: 'Flooz', kind: 'Mobile money' },
  { id: 'orange', label: 'Orange Money', kind: 'Mobile money' },
  { id: 'mtn', label: 'MTN MoMo', kind: 'Mobile money' },
  { id: 'wave', label: 'Wave', kind: 'Mobile money' },
  { id: 'card', label: 'Carte bancaire', kind: 'Visa, Mastercard' },
];

/** 15000 -> "15 000" (espace insécable fine). */
export const spaced = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const money = (n: number): string => spaced(n) + ' F CFA';
export const moneyShort = (n: number): string => spaced(n) + ' F';
