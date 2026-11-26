import { storeFr } from './store-fr';
import { adminFr } from './admin-fr';
export const fr: Record<string, string> = { ...storeFr, ...adminFr };
