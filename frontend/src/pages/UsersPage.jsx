import { useState, useEffect } from 'react';
import {
  getUsers,
  deleteUser,
  getPetsByOwner,
  createClientAsAdmin,
  createAdmin,
  createAppointment,
} from '../lib/api';
import UserCard from '../components/UserCard';
import AddUserForm from '../components/AddUserForm';
import AppointmentForm from '../components/AppointmentForm';
import { Search, Plus } from 'lucide-react';
import { Button, Card, Input, LoadingState, EmptyState } from '../components/ui';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [petsByUser, setPetsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [bookingFor, setBookingFor] = useState(null);

  const fetchUsers = async () => {
    const res = await getUsers();
    if (res.success) {
      const userList = res.data || [];
      setUsers(userList);

      const petResults = await Promise.all(
        userList.map((u) => getPetsByOwner(u.id).then((r) => [u.id, r.success ? (r.data || []) : []]))
      );
      setPetsByUser(Object.fromEntries(petResults));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const res = await deleteUser(id);
    if (res.success) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  const handleBookAppointment = async (data) => {
    if (!bookingFor) return { success: false, message: 'No customer selected' };
    const res = await createAppointment(bookingFor.id, data);
    if (res.success) setBookingFor(null);
    return res;
  };

  const handleCreate = async (role, data) => {
    const res = role === 'admin' ? await createAdmin(data) : await createClientAsAdmin(data);
    if (res.success) {
      const newUser = res.data?.user || res.data;
      if (newUser) {
        setUsers((prev) => [newUser, ...prev]);
        setPetsByUser((prev) => ({ ...prev, [newUser.id]: [] }));
      }
      setShowForm(false);
    }
    return res;
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter((u) => {
        const nameMatch = `${u.first_name} ${u.last_name}`.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const petMatch = (petsByUser[u.id] || []).some((p) => p.name.toLowerCase().includes(q));
        return nameMatch || emailMatch || petMatch;
      })
    : users;

  if (loading) {
    return <LoadingState text="Loading customers..." />;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-(--color-foreground)">All Customers</h1>
          <span className="text-sm text-(--color-muted-foreground)">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> Add User
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4 text-(--color-foreground)">Add New User</h2>
            <AddUserForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
          </div>
        </Card>
      )}

      {bookingFor && (
        <Card className="mb-6">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-1 text-(--color-foreground)">
              Request Appointment
            </h2>
            <p className="text-sm text-(--color-muted-foreground) mb-4">
              Booking on behalf of{' '}
              <span className="font-medium text-(--color-foreground)">
                {bookingFor.first_name} {bookingFor.last_name}
              </span>
            </p>
            <AppointmentForm
              ownerId={bookingFor.id}
              onSubmit={handleBookAppointment}
              onCancel={() => setBookingFor(null)}
              allowOverride
            />
          </div>
        </Card>
      )}

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-muted-foreground)" />
        <Input
          type="text"
          placeholder="Search by name, email, or pet name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-4"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={q ? 'No customers match your search.' : 'No customers registered yet.'} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              pets={petsByUser[user.id] || []}
              onDelete={handleDelete}
              onRequestAppointment={(u) => {
                setBookingFor(u);
                setShowForm(false);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
