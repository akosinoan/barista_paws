import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  getMyAppointments,
  createAppointment,
  cancelAppointment,
} from '../lib/api';
import AppointmentForm from '../components/AppointmentForm';
import AppointmentCard from '../components/AppointmentCard';
import { Plus } from 'lucide-react';
import { Button, Card, LoadingState, EmptyState } from '../components/ui';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!location.state?.openForm);

  useEffect(() => {
    if (!user) return;
    getMyAppointments(user.id).then((res) => {
      if (res.success) setAppointments(res.data || []);
      setLoading(false);
    });
  }, [user]);

  const handleCreate = async (data) => {
    const res = await createAppointment(user.id, data);
    if (res.success) {
      setAppointments([res.data, ...appointments]);
      setShowForm(false);
    }
    return res;
  };

  const handleUpdated = (updated) => {
    setAppointments((cur) => cur.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    const res = await cancelAppointment(id);
    if (res.success) {
      setAppointments((cur) => cur.map((a) => (a.id === id ? res.data : a)));
    } else {
      alert(res.message || 'Failed to cancel appointment');
    }
  };

  if (!user) return null;
  if (loading) return <LoadingState text="Loading appointments..." />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-(--color-foreground)">My Appointments</h1>
          <p className="text-sm text-(--color-muted-foreground) mt-1">
            Request and track your pet visits.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} /> Add Appointment
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-5 text-(--color-foreground)">
              Request an Appointment
            </h2>
            <AppointmentForm
              ownerId={user.id}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </Card>
      )}

      {appointments.length === 0 ? (
        <EmptyState message='No appointments yet. Click "Add Appointment" to request your first visit!' />
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onCancel={handleCancel}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
