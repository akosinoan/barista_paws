import { useState } from 'react';
import { Button, Input, Textarea, Label } from './ui';

export default function PetForm({ pet, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: pet?.name || '',
    species: pet?.species || '',
    breed: pet?.breed || '',
    age: pet?.age ?? '',
    weight: pet?.weight ?? '',
    notes: pet?.notes || '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      species: form.species,
      breed: form.breed || null,
      age: form.age ? parseInt(form.age, 10) : null,
      weight: form.weight ? parseFloat(form.weight) : null,
      notes: form.notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Name *</Label>
        <Input name="name" value={form.name} onChange={handleChange} required />
      </div>
      <div>
        <Label>Species *</Label>
        <Input name="species" value={form.species} onChange={handleChange} required placeholder="e.g. Dog, Cat, Bird" />
      </div>
      <div>
        <Label>Breed</Label>
        <Input name="breed" value={form.breed} onChange={handleChange} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Age</Label>
          <Input name="age" type="number" value={form.age} onChange={handleChange} />
        </div>
        <div>
          <Label>Weight (kg)</Label>
          <Input name="weight" type="number" step="0.1" value={form.weight} onChange={handleChange} />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />
      </div>
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit">{pet ? 'Update Pet' : 'Add Pet'}</Button>
      </div>
    </form>
  );
}
