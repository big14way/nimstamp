import { useCallback, useEffect, useState } from 'react';
import { api, session, type MerchantMe } from '../api/client';
import { errorCode } from '../lib/errors';

/** Merchant session: loads /merchants/me with the stored bearer token. */
export function useMerchant() {
  const [me, setMe] = useState<MerchantMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!session.get()) {
      setError('UNAUTHORIZED');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setMe(await api.merchantMe());
      setError(null);
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { me, error, loading, reload: load, setMe };
}
