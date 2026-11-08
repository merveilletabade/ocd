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

export interface AdminRow {
  ref: string;
  biz: string;
  person: string;
  remote: boolean;
  place: string;
  when: string;
  pkg: string;
  amount: number;
  method: string;
  status: 'Payé' | 'En attente' | 'Annulé';
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

/** Données d'exemple pour l'espace admin. */
export const ADMIN_ROWS: AdminRow[] = [
  { ref: 'OCD-0112-0007', biz: 'Atelier Wax Lomé', person: 'Ama Koffi', remote: false, place: 'Présentiel · Lomé', when: 'Mar. 1 déc., 09:00', pkg: 'Boost', amount: 20000, method: 'T-Money', status: 'Payé' },
  { ref: 'OCD-0112-0008', biz: 'Boutique Kossi', person: 'Kossi Mensah', remote: true, place: 'Distance · Bénin', when: 'Mar. 1 déc., 10:45', pkg: 'Standard', amount: 15000, method: 'Flooz', status: 'Payé' },
  { ref: 'OCD-0212-0011', biz: 'Savons du Sahel', person: 'Awa Diallo', remote: true, place: 'Distance · Sénégal', when: 'Mer. 2 déc., 14:15', pkg: 'Premium', amount: 45000, method: 'Wave', status: 'En attente' },
  { ref: 'OCD-0212-0012', biz: 'Cacao Pur', person: 'Yao Agbo', remote: false, place: 'Présentiel · Lomé', when: 'Mer. 2 déc., 16:00', pkg: 'Boost', amount: 20000, method: 'MTN MoMo', status: 'Payé' },
  { ref: 'OCD-0312-0015', biz: 'Mode Abidjan Chic', person: 'Fatou Traoré', remote: true, place: "Distance · Côte d'Ivoire", when: 'Jeu. 3 déc., 09:00', pkg: 'Standard', amount: 15000, method: 'Orange Money', status: 'Payé' },
  { ref: 'OCD-0312-0016', biz: 'Tech Accra Hub', person: 'Kofi Boateng', remote: true, place: 'Distance · Ghana', when: 'Jeu. 3 déc., 12:30', pkg: 'Boost', amount: 20000, method: 'Carte bancaire', status: 'En attente' },
  { ref: 'OCD-0412-0019', biz: 'Jus Tropical', person: 'Esi Amegah', remote: false, place: 'Présentiel · Lomé', when: 'Ven. 4 déc., 10:45', pkg: 'Standard', amount: 15000, method: 'T-Money', status: 'Annulé' },
  { ref: 'OCD-0412-0020', biz: 'Beauté Douala', person: 'Nadège Fotso', remote: true, place: 'Distance · Cameroun', when: 'Ven. 4 déc., 14:15', pkg: 'Premium', amount: 45000, method: 'Carte bancaire', status: 'Payé' },
  { ref: 'OCD-0512-0023', biz: 'Épices du Faso', person: 'Issa Ouédraogo', remote: true, place: 'Distance · Burkina Faso', when: 'Sam. 5 déc., 09:00', pkg: 'Boost', amount: 20000, method: 'Orange Money', status: 'Payé' },
  { ref: 'OCD-0512-0024', biz: 'Poterie Kara', person: 'Mawuli Tchalla', remote: false, place: 'Présentiel · Lomé', when: 'Sam. 5 déc., 16:00', pkg: 'Standard', amount: 15000, method: 'Flooz', status: 'En attente' },
];

export const WEEK = [
  { label: 'Mar. 1', count: 4 },
  { label: 'Mer. 2', count: 3 },
  { label: 'Jeu. 3', count: 5 },
  { label: 'Ven. 4', count: 2 },
  { label: 'Sam. 5', count: 6 },
  { label: 'Dim. 6', count: 1 },
  { label: 'Lun. 7', count: 3 },
];

/** 15000 -> "15 000" (espace insécable fine). */
export const spaced = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const money = (n: number): string => spaced(n) + ' F CFA';
export const moneyShort = (n: number): string => spaced(n) + ' F';
