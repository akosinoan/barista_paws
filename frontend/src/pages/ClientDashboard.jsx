import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getPetsByOwner, getMyAppointments, cancelAppointment } from '../lib/api';
import AppointmentCard from '../components/AppointmentCard';
import PetsSection from '../components/PetsSection';
import { Plus } from 'lucide-react';
import { Button, Card, CardHeader, CardBody, EmptyState } from '../components/ui';
import { Skeleton } from '../components/ui/LoadingState';

/* ── Appointments section ── */
function AppointmentsSection({ userId }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAppointments(userId).then((res) => {
      if (res.success) setAppointments(res.data || []);
      setLoading(false);
    });
  }, [userId]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    const res = await cancelAppointment(id);
    if (res.success) {
      setAppointments((cur) => cur.map((a) => (a.id === id ? res.data : a)));
    } else {
      alert(res.message || 'Failed to cancel appointment');
    }
  };

  return (
    <Card>
      <CardHeader
        title="My Appointments"
        action={
          <Button as={Link} to="/appointments" state={{ openForm: true }} size="sm">
            <Plus size={16} /> Add Appointment
          </Button>
        }
      />
      <CardBody>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : appointments.length === 0 ? (
          <EmptyState
            message='No appointments yet. Click "Add Appointment" to request your first visit!'
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {appointments.slice(0, 3).map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onCancel={handleCancel}
              />
            ))}
            {appointments.length > 3 && (
              <Link
                to="/appointments"
                className="block text-center text-sm text-(--color-primary) hover:underline pt-1"
              >
                View all {appointments.length} appointments
              </Link>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ── Client Dashboard ── */
export default function ClientDashboard() {
  const { user } = useAuth();
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getPetsByOwner(user.id).then((res) => {
      if (res.success) setPets(res.data || []);
      setPetsLoading(false);
    });
  }, [user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-(--color-background)">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-(--color-foreground)">
          Welcome back, {user.first_name}! 🐾
        </h1>
        {!petsLoading && pets.length > 0 && <AppointmentsSection userId={user.id} />}
        <PetsSection userId={user.id} pets={pets} setPets={setPets} loading={petsLoading} />
      </div>
    </div>
  );
}
