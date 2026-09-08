const safe = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export type Role = 'customer' | 'business';

export const store = {
  role: { get: () => safe.get('ns_role') as Role | null, set: (r: Role) => safe.set('ns_role', r), clear: () => safe.del('ns_role') },
  address: { get: () => safe.get('ns_address'), set: (a: string) => safe.set('ns_address', a), clear: () => safe.del('ns_address') },
  lastCard: { get: () => safe.get('ns_last_card'), set: (id: string) => safe.set('ns_last_card', id) },
  customerCard: {
    get: (cardId: string) => safe.get(`ns_cc_${cardId}`),
    set: (cardId: string, id: string) => safe.set(`ns_cc_${cardId}`, id),
  },
  lang: { get: () => safe.get('ns_lang'), set: (l: string) => safe.set('ns_lang', l) },
};
