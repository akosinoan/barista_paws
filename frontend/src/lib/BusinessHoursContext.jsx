import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getBusinessHours } from './api';

const DEFAULTS = { open_time: '09:00:00', close_time: '18:00:00', slot_minutes: 30 };

const BusinessHoursContext = createContext({
  hours: DEFAULTS,
  loading: true,
  error: '',
  refresh: () => {},
});

export function BusinessHoursProvider({ children }) {
  const [hours, setHours] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getBusinessHours();
    if (res && res.success && res.data) {
      setHours({
        open_time: res.data.open_time,
        close_time: res.data.close_time,
        slot_minutes: res.data.slot_minutes,
      });
    } else if (res) {
      setError(res.message || 'Failed to load business hours');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <BusinessHoursContext.Provider value={{ hours, loading, error, refresh: load }}>
      {children}
    </BusinessHoursContext.Provider>
  );
}

export function useBusinessHours() {
  return useContext(BusinessHoursContext);
}
