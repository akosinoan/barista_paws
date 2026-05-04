import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { getPetsByOwner, createPet, updatePet, deletePet, getUser, uploadPetPhoto } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import PetCard from '../components/PetCard';
import PetForm from '../components/PetForm';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button, Card, LoadingState, EmptyState } from '../components/ui';

export default function PetsPage() {
  const { userId } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const isOwnPage = user?.id === userId;
  const canView = isAdmin || isOwnPage;

  const fetchData = async () => {
    if (!canView) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    const [petsRes, userRes] = await Promise.all([
      getPetsByOwner(userId),
      getUser(userId),
    ]);
    if (petsRes.success) {
      setPets(petsRes.data || []);
    } else {
      setAccessDenied(true);
    }
    if (userRes.success) setOwner(userRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  if (accessDenied) {
    return <Navigate to={`/users/${user.id}/pets`} replace />;
  }

  const handleCreate = async (data) => {
    const res = await createPet(userId, data);
    if (res.success) {
      setPets([res.data, ...pets]);
      setShowForm(false);
    }
  };

  const handleUpdate = async (data) => {
    const res = await updatePet(editingPet.id, data);
    if (res.success) {
      setPets(pets.map((p) => (p.id === editingPet.id ? res.data : p)));
      setEditingPet(null);
    }
  };

  const handleDelete = async (petId) => {
    if (!confirm('Are you sure you want to delete this pet?')) return;
    const res = await deletePet(petId);
    if (res.success) {
      setPets(pets.filter((p) => p.id !== petId));
    }
  };

  const handleUploadPhoto = async (petId, file) => {
    const res = await uploadPetPhoto(petId, file);
    if (res.success) {
      setPets(pets.map((p) => p.id === petId ? { ...p, photo_url: res.data.url } : p));
    }
  };

  if (loading) {
    return <LoadingState text="Loading pets..." />;
  }

  const canEdit = isAdmin || isOwnPage;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {isAdmin && (
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft size={16} /> Back
        </Button>
      )}
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-(--color-foreground)">
            {owner ? (isOwnPage ? 'My Pets' : `${owner.first_name}'s Pets`) : 'Pets'}
          </h1>
          {owner && (
            <p className="text-sm text-(--color-muted-foreground) mt-1">{owner.email}</p>
          )}
        </div>
        {canEdit && (
          <Button onClick={() => { setShowForm(true); setEditingPet(null); }}>
            <Plus size={18} /> Add Pet
          </Button>
        )}
      </div>

      {(showForm || editingPet) && canEdit && (
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-(--color-foreground)">
              {editingPet ? 'Edit Pet' : 'Add New Pet'}
            </h2>
            <PetForm
              pet={editingPet}
              onSubmit={editingPet ? handleUpdate : handleCreate}
              onCancel={() => { setShowForm(false); setEditingPet(null); }}
            />
          </div>
        </Card>
      )}

      {pets.length === 0 ? (
        <EmptyState message={`No pets registered yet.${canEdit ? ' Click "Add Pet" to get started!' : ''}`} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onEdit={canEdit ? (p) => { setEditingPet(p); setShowForm(false); } : null}
              onDelete={canEdit ? handleDelete : null}
              onUploadPhoto={canEdit ? handleUploadPhoto : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
