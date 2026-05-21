import { useState, useEffect, useMemo } from 'react';
import {
  getAllAppointments,
  getUsers,
  approveAppointment,
  rejectAppointment,
  completeAppointment,
  cancelAppointment,
} from '../lib/api';
import AppointmentCard from '../components/AppointmentCard';
import PetDetailsModal from '../components/PetDetailsModal';
import ClientDetailsModal from '../components/ClientDetailsModal';
import { Card, CardHeader, CardBody, LoadingState, EmptyState } from '../components/ui';
import { toIsoDate } from '../components/scheduling/slotUtils';

const STATUS_FILTERS = ['all', 'pending', 'approved', 'completed', 'rejected', 'cancelled'];

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState({});
  const [clientById, setClientById] = useState({});
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    const [apptRes, userRes] = await Promise.all([
      getAllAppointments(),
      getUsers(),
    ]);
    if (apptRes.success) setAppointments(apptRes.data || []);
    if (userRes.success) {
      const map = {};
      const byId = {};
      for (const u of userRes.data || []) {
        map[u.id] = `${u.first_name} ${u.last_name}`;
        byId[u.id] = u;
      }
      setClients(map);
      setClientById(byId);
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
    if (!confirm('Cancel this appointment?')) return;
    const res = await cancelAppointment(id);
    if (res.success) {
      updateOne(res.data);
    } else {
      alert(res.message || 'Failed to cancel appointment');
    }
  };

  const today = useMemo(() => toIsoDate(new Date()), []);
  const approvedToday = appointments.filter(
    (a) => a.appointment_date === today && a.status === 'approved',
  );

  const q = search.trim().toLowerCase();
  const filtered = appointments.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (dateFrom && a.appointment_date < dateFrom) return false;
    if (dateTo && a.appointment_date > dateTo) return false;
    if (q) {
      const name = (clients[a.client_id] || '').toLowerCase();
      const petNames = (a.pets || []).map((p) => p.name).join(' ').toLowerCase();
      const notes = (a.notes || '').toLowerCase();
      const time = (a.time_slot || '').toLowerCase();
      if (
        !name.includes(q) &&
        !petNames.includes(q) &&
        !notes.includes(q) &&
        !time.includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const resetFilters = () => {
    setFilter('all');
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters =
    filter !== 'all' || search !== '' || dateFrom !== '' || dateTo !== '';

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
          title={`Today's Approved Appointments (${approvedToday.length})`}
        />
        <CardBody>
          {loading ? (
            <LoadingState text="Loading appointments..." />
          ) : approvedToday.length === 0 ? (
            <EmptyState message="No approved appointments scheduled for today." />
          ) : (
            <div className="space-y-3">
              {approvedToday.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  clientName={clients[appt.client_id]}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                  onPetClick={setSelectedPet}
                  onClientClick={setSelectedClientId}
                  highlight
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="All Appointments" />
        <CardBody>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-(--color-muted-foreground) mb-1">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Client, pet, notes, time..."
                className="w-full px-3 py-1.5 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-sm focus:outline-none focus:ring-2 focus:ring-(--color-ring)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-(--color-muted-foreground) mb-1">
                Status
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-sm focus:outline-none focus:ring-2 focus:ring-(--color-ring)"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-(--color-muted-foreground) mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-sm focus:outline-none focus:ring-2 focus:ring-(--color-ring)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-(--color-muted-foreground) mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-sm focus:outline-none focus:ring-2 focus:ring-(--color-ring)"
                />
              </div>
            </div>
          </div>
          {hasFilters && (
            <div className="mb-4 flex items-center justify-between text-xs text-(--color-muted-foreground)">
              <span>
                Showing {filtered.length} of {appointments.length}
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="text-(--color-primary) hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          )}
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
                  onPetClick={setSelectedPet}
                  onClientClick={setSelectedClientId}
                  highlight={appt.appointment_date === today}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <PetDetailsModal
        open={selectedPet !== null}
        onClose={() => setSelectedPet(null)}
        pet={selectedPet}
      />
      <ClientDetailsModal
        open={selectedClientId !== null}
        onClose={() => setSelectedClientId(null)}
        clientId={selectedClientId}
        initialClient={selectedClientId ? clientById[selectedClientId] : null}
      />
    </div>
  );
}
