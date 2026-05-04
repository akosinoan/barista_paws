import { useState, useEffect } from 'react';
import {
  getAllAppointments,
  getUsers,
  approveAppointment,
  rejectAppointment,
  completeAppointment,
  deleteAppointment,
} from '../lib/api';
import AppointmentCard from '../components/AppointmentCard';
import BlockedSlotManager from '../components/BlockedSlotManager';
import { Card, CardHeader, CardBody, LoadingState, EmptyState } from '../components/ui';

const STATUS_FILTERS = ['all', 'pending', 'approved', 'completed', 'rejected', 'cancelled'];

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    const [apptRes, userRes] = await Promise.all([
      getAllAppointments(),
      getUsers(),
    ]);
    if (apptRes.success) setAppointments(apptRes.data || []);
    if (userRes.success) {
      const map = {};
      for (const u of userRes.data || []) {
        map[u.id] = `${u.first_name} ${u.last_name}`;
      }
      setClients(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateOne = (updated) => {
    setAppointments((cur) => cur.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleApprove = async (id) => {
    const res = await approveAppointment(id);
    if (res.success) updateOne(res.data);
  };

  const handleReject = async (id) => {
    const res = await rejectAppointment(id);
    if (res.success) updateOne(res.data);
  };

  const handleComplete = async (id) => {
    const res = await completeAppointment(id);
    if (res.success) updateOne(res.data);
  };

  const handleCancel = async (id) => {
    if (!confirm('Delete this appointment? This cannot be undone.')) return;
    const res = await deleteAppointment(id);
    if (res.success) {
      setAppointments(appointments.filter((a) => a.id !== id));
    }
  };

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter((a) => a.status === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-(--color-foreground)">Appointments</h1>
        <p className="text-sm text-(--color-muted-foreground) mt-1">
          Review, approve, and manage client appointments.
        </p>
      </div>

      <Card>
        <CardHeader
          title="All Appointments"
          action={
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-sm focus:outline-none focus:ring-2 focus:ring-(--color-ring)"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          }
        />
        <CardBody>
          {loading ? (
            <LoadingState text="Loading appointments..." />
          ) : filtered.length === 0 ? (
            <EmptyState message="No appointments to show." />
          ) : (
            <div className="space-y-3">
              {filtered.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  clientName={clients[appt.client_id]}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Blocked Timeslots" />
        <CardBody>
          <BlockedSlotManager />
        </CardBody>
      </Card>
    </div>
  );
}
