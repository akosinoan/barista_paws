import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import {
  getPetsByOwner, createPet, updatePet, deletePet, uploadPetPhoto,
  getMyAppointments, deleteAppointment,
} from '../lib/api';
import PetCard from '../components/PetCard';
import PetForm from '../components/PetForm';
import AppointmentCard from '../components/AppointmentCard';
import { Plus } from 'lucide-react';
import { Button, Card, CardHeader, CardBody, EmptyState } from '../components/ui';
import { Skeleton } from '../components/ui/LoadingState';

/* ── Pets section ── */
function PetsSection({ userId }) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState(null);

  useEffect(() => {
    getPetsByOwner(userId).then((res) => {
      if (res.success) setPets(res.data || []);
      setLoading(false);
    });
  }, [userId]);

  const handleCreate = async (data) => {
    const res = await createPet(userId, data);
    if (res.success) { setPets([res.data, ...pets]); setShowForm(false); }
  };

  const handleUpdate = async (data) => {
    const res = await updatePet(editingPet.id, data);
    if (res.success) { setPets(pets.map((p) => p.id === editingPet.id ? res.data : p)); setEditingPet(null); }
  };

  const handleDelete = async (petId) => {
    if (!confirm('Delete this pet?')) return;
    const res = await deletePet(petId);
    if (res.success) setPets(pets.filter((p) => p.id !== petId));
  };

  const handleUploadPhoto = async (petId, file) => {
    const res = await uploadPetPhoto(petId, file);
    if (res.success) setPets(pets.map((p) => p.id === petId ? { ...p, photo_url: res.data.url } : p));
  };

  return (
    <Card>
      <CardHeader
        title="My Pets"
        action={
          <Button size="sm" onClick={() => { setShowForm(true); setEditingPet(null); }}>
            <Plus size={16} /> Add Pet
          </Button>
        }
      />

      <CardBody>
        {(showForm || editingPet) && (
          <div className="mb-6 p-4 rounded-lg border border-(--color-border) bg-(--color-muted)/30">
            <h3 className="text-sm font-semibold mb-3 text-(--color-foreground)">
              {editingPet ? 'Edit Pet' : 'Add New Pet'}
            </h3>
            <PetForm
              pet={editingPet}
              onSubmit={editingPet ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingPet(null); }}
            />
          </div>
        )}

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : pets.length === 0 ? (
          <EmptyState message='No pets yet. Click "Add Pet" to register your first furry friend!' className="py-10" />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onEdit={(p) => { setEditingPet(p); setShowForm(false); }}
                onDelete={handleDelete}
                onUploadPhoto={handleUploadPhoto}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

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
    const res = await deleteAppointment(id);
    if (res.success) setAppointments(appointments.filter((a) => a.id !== id));
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-(--color-background)">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-(--color-foreground)">
          Welcome back, {user.first_name}! 🐾
        </h1>
        <AppointmentsSection userId={user.id} />
        <PetsSection userId={user.id} />
      </div>
    </div>
  );
}
