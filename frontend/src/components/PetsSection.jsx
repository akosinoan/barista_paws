import { useState } from 'react';
import { createPet, updatePet, deletePet, uploadPetPhoto } from '../lib/api';
import PetCard from './PetCard';
import PetForm from './PetForm';
import { Plus } from 'lucide-react';
import { Button, Card, CardHeader, CardBody, EmptyState } from './ui';
import { Skeleton } from './ui/LoadingState';

export default function PetsSection({ userId, pets, setPets, loading, title = 'My Pets', canEdit = true, emptyMessage = 'No pets yet. Click "Add Pet" to register your first furry friend!' }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState(null);

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
        title={title}
        action={
          canEdit && (
            <Button size="sm" onClick={() => { setShowForm(true); setEditingPet(null); }}>
              <Plus size={16} /> Add Pet
            </Button>
          )
        }
      />

      <CardBody>
        {(showForm || editingPet) && canEdit && (
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
          <EmptyState message={emptyMessage} className="py-10" />
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
      </CardBody>
    </Card>
  );
}
