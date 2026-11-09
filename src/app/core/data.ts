export type Mode = 'presentiel' | 'distance';

export interface Pkg {
  id: string;
  name: string;
  price: number;
  tagline: string;
  features: string[];
  badge?: boolean;
  /** Nombre de blocs de 1h30 : 1 = 1h30, 2 = 3h, 3 = 4h30 */
  slots: number;
  vip: boolean;
  /** Promo active sur cette offre (0 = aucune), activée depuis l'admin */
  promo_percent?: number;
}

export interface PayMethod {
  id: string;
  label: string;
  logo: string;
  card?: boolean;
}

/**
 * Logos des moyens de paiement : dossier src/assets/payments/
 * Chaque moyen pointe vers son fichier. Free Money n'a pas encore de logo :
 * ajoute un fichier free-money.png dans le dossier et il s'affichera tout seul.
 */
const pay = (id: string, label: string, file: string, card = false): PayMethod => ({
  id,
  label,
  card,
  logo: `assets/payments/${file}`,
});

/** Moyens de paiement FedaPay. */
export const PAYMENTS: PayMethod[] = [
  pay('mixx', 'Mixx by Yas', 'mixx-by-yas.png'),
  pay('moov', 'Moov Money', 'moov-money.jpg'),
  pay('mtn', 'MTN MoMo', 'mtn-momo.png'),
  pay('orange', 'Orange Money', 'orange-money.png'),
  pay('wave', 'Wave', 'wave.png'),
  pay('celtiis', 'Celtiis', 'celtiis.jpg'),
  pay('bmo', 'BMO', 'bmo.jpg'),
  pay('coris', 'Coris Money', 'coris-money.jpg'),
  pay('free', 'Free Money', 'free-money.png'),
  pay('airtel', 'Airtel Money', 'airtel-money.png'),
  pay('visa', 'Visa', 'visa.png', true),
  pay('mastercard', 'Mastercard', 'mastercard.png', true),
];

export const DOWS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export const COUNTRIES = [
  'Togo', 'Bénin', "Côte d'Ivoire", 'Sénégal', 'Ghana', 'Nigeria', 'Cameroun',
  'Burkina Faso', 'Mali', 'Niger', 'Gabon', 'RD Congo', 'Kenya', 'Maroc',
];

/** Une journée = 6 blocs de 1h30 enchaînés, de 09:00 à 18:00. */
export const SLOT_STARTS = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];
export const DAY_END = '18:00';

export const timeRange = (start: number, blocks = 1): string => {
  const end = start + blocks < SLOT_STARTS.length ? SLOT_STARTS[start + blocks] : DAY_END;
  return `${SLOT_STARTS[start]} – ${end}`;
};

/** 1 -> "1h30", 2 -> "3h", 3 -> "4h30" */
export const durationLabel = (blocks: number): string => {
  const min = blocks * 90;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}` : `${h}h`;
};

/** Offres par défaut, utilisées seulement si l'API est injoignable. */
export const PACKAGES: Pkg[] = [
  {
    id: 'standard', name: 'Standard', price: 15000, slots: 1, vip: false,
    tagline: "Ton live de 1h30, l'essentiel.",
    features: ['Live de 1h30', 'Enregistrement du live', 'Replay envoyé sous 48 h'],
  },
  {
    id: 'boost', name: 'Boost', price: 20000, slots: 1, vip: false, badge: true,
    tagline: 'Ton live annoncé sur les réseaux OCD.',
    features: ['Tout le pack Standard', 'Annonce sur les réseaux OCD', 'Affiche personnalisée de ton live'],
  },
  {
    id: 'premium', name: 'Premium', price: 45000, slots: 1, vip: false,
    tagline: 'La visibilité maximale, avec Bovan.',
    features: ['Tout le pack Boost', 'Bovan annonce ton live sur son compte', 'Mise en avant le jour J'],
  },
  {
    id: 'vip', name: 'VIP', price: 60000, slots: 2, vip: true,
    tagline: '3 heures pour présenter toute ta gamme.',
    features: ['Live de 3h', 'Annonce par Bovan sur son compte', 'Replay et extraits pour tes réseaux'],
  },
  {
    id: 'vip-prestige', name: 'VIP Prestige', price: 90000, slots: 3, vip: true,
    tagline: '4h30 en exclusivité, le format le plus complet.',
    features: ['Live de 4h30', 'Bovan présent et annonce sur son compte', 'Replay, extraits et affiche personnalisée'],
  },
];

/** 15000 -> "15 000" (espace insécable fine). */
export const spaced = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const money = (n: number): string => spaced(n) + ' F CFA';
export const moneyShort = (n: number): string => spaced(n) + ' F';
