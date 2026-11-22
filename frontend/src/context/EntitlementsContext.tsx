import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { entitlementService } from '../services/entitlementService';
import { setEntitlementSnapshot } from '../utils/entitlements';

interface Value {
  /** changes whenever the effective entitlements change, so consumers re-render */
  version: string;
  /** true once entitlements are loaded, failed (fail-open), or no user is logged in */
  ready: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Value>({ version: '', ready: true, refresh: async () => undefined });
export const useEntitlements = () => useContext(Ctx);

export const EntitlementsProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const token = user?.token || null;
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState('');
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    const mine = ++seq.current;
    try {
      const data = await entitlementService.me();
      if (mine === seq.current) {
        setEntitlementSnapshot(data);
        setVersion(`${data.mode}:${data.version}`);
      }
    } catch {
      /* fail-open: keep the previous snapshot (or none) */
    } finally {
      if (mine === seq.current) setReady(true);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      seq.current += 1;
      setEntitlementSnapshot(null);
      setVersion('');
      setReady(true);
      return undefined;
    }
    setReady(false);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [token, refresh]);

  // A server refusal means our copy is stale: refresh immediately.
  useEffect(() => {
    const original = window.fetch;
    const wrapped: typeof window.fetch = async (input, init) => {
      const res = await original(input, init);
      if (res.status === 403) {
        res
          .clone()
          .text()
          .then((t) => {
            if (t.includes('FEATURE_NOT_LICENSED')) void refresh();
          })
          .catch(() => undefined);
      }
      return res;
    };
    window.fetch = wrapped;
    return () => {
      if (window.fetch === wrapped) window.fetch = original;
    };
  }, [refresh]);

  const value = useMemo(() => ({ version, ready, refresh }), [version, ready, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
