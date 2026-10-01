import { useState, useEffect, useCallback } from 'react';

/**
 * One fetch, with the three states a page actually has.
 *
 * Every page in this product did `if (ok && data.success) setThing(...)` with
 * no else, so a failed request silently became an empty list. Skill demand
 * told a contributor there was nothing to measure when the platform had a
 * hundred open roles and the request had simply failed. That is worse than an
 * error, because the person believes it and leaves.
 *
 * LOADING, FAILED, and LOADED are different things and a page has to be able
 * to tell them apart. Twenty-odd near-identical fixes would have drifted
 * apart within a month; this is the one place it lives.
 *
 * Usage:
 *   const { data, loading, failed, reload } = useFetch(() => getThing(id), [id]);
 */
export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fn();
      // Both shapes are in use across this codebase: { ok, data } from the
      // api helper, and a bare payload from anything already unwrapped.
      const payload = res && typeof res === 'object' && 'ok' in res ? res.data : res;
      const ok = res && typeof res === 'object' && 'ok' in res ? res.ok : true;
      if (ok && payload && payload.success !== false) setData(payload);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, failed, reload: run };
}

export default useFetch;
