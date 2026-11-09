/** Adresse de l'API FastAPI. Change-la quand le backend sera en ligne. */
export const API_URL = 'http://localhost:8000/api';

/**
 * Mode démo : le site fonctionne sans backend (données de test enregistrées dans le navigateur).
 * Actif automatiquement dès que le site n'est pas ouvert sur localhost (ex. Vercel).
 * En local, le vrai backend est utilisé. Pour forcer la démo partout : mets `true`.
 */
export const DEMO =
  typeof location !== 'undefined' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
