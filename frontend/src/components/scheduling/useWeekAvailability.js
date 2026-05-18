import { useCallback, useEffect, useRef, useState } from 'react';
import { getAvailableTimeslots } from '../../lib/api';
import { toIsoDate, weekDates } from './slotUtils';

export default function useWeekAvailability(weekStart) {
  const cacheRef = useRef(new Map());
  const reqIdRef = useRef(0);
  const [daysMap, setDaysMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isoList = weekDates(weekStart).map(toIsoDate);
  const key = isoList.join('|');

  const fetchWeek = useCallback(
    async (force = false) => {
      const myReq = ++reqIdRef.current;
      setError('');

      const cached = {};
      const missing = [];
      for (const iso of isoList) {
        if (!force && cacheRef.current.has(iso)) {
          cached[iso] = cacheRef.current.get(iso);
        } else {
          missing.push(iso);
        }
      }

      if (missing.length === 0) {
        setDaysMap(cached);
        setLoading(false);
        return;
      }

      setDaysMap(cached);
      setLoading(true);

      try {
        const results = await Promise.all(
          missing.map((iso) =>
            getAvailableTimeslots(iso).then((res) => ({ iso, res })),
          ),
        );
        if (myReq !== reqIdRef.current) return;
        const next = { ...cached };
        for (const { iso, res } of results) {
          const data = res && res.success ? res.data || [] : [];
          cacheRef.current.set(iso, data);
          next[iso] = data;
        }
        setDaysMap(next);
      } catch (e) {
        if (myReq === reqIdRef.current) {
          setError(e?.message || 'Failed to load availability');
        }
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  useEffect(() => {
    fetchWeek(false);
  }, [fetchWeek]);

  const refetch = useCallback(
    (isoOrAll) => {
      if (typeof isoOrAll === 'string') {
        cacheRef.current.delete(isoOrAll);
      } else {
        cacheRef.current.clear();
      }
      return fetchWeek(true);
    },
    [fetchWeek],
  );

  return { daysMap, loading, error, refetch };
}
