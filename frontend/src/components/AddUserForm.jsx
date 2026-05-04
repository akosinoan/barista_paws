import { useState } from 'react';
import { Button, Input, Label, Alert, RadioGroup } from './ui';

const ROLE_OPTIONS = [
  { value: 'client', label: 'Client' },
  { value: 'admin', label: 'Admin' },
];

export default function AddUserForm({ onSubmit, onCancel }) {
  const [role, setRole] = useState('client');
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
    vip_card_number: '',
    access_level: '1',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const base = {
      email: form.email,
      password: form.password,
      first_name: form.first_name,
      last_name: form.last_name,
      phone_number: form.phone_number || null,
      address: form.address || null,
    };

    const data =
      role === 'admin'
        ? { ...base, access_level: parseInt(form.access_level, 10) || 1 }
        : { ...base, vip_card_number: form.vip_card_number || null };

    const res = await onSubmit(role, data);
    setSubmitting(false);
    if (res && res.success === false) {
      setError(res.message || 'Failed to create user');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <Label className="mb-2 block text-sm">Role *</Label>
        <RadioGroup name="role" value={role} onChange={setRole} options={ROLE_OPTIONS} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>First Name *</Label>
          <Input name="first_name" value={form.first_name} onChange={handleChange} required />
        </div>
        <div>
          <Label>Last Name *</Label>
          <Input name="last_name" value={form.last_name} onChange={handleChange} required />
        </div>
      </div>

      <div>
        <Label>Email *</Label>
        <Input name="email" type="email" value={form.email} onChange={handleChange} required />
      </div>

      <div>
        <Label>Password *</Label>
        <Input
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
        />
      </div>

      <div>
        <Label>Phone Number</Label>
        <Input name="phone_number" value={form.phone_number} onChange={handleChange} />
      </div>

      <div>
        <Label>Address</Label>
        <Input name="address" value={form.address} onChange={handleChange} />
      </div>

      {role === 'client' ? (
        <div>
          <Label>VIP Card Number</Label>
          <Input
            name="vip_card_number"
            value={form.vip_card_number}
            onChange={handleChange}
            placeholder="Optional"
          />
        </div>
      ) : (
        <div>
          <Label>Access Level *</Label>
          <Input
            name="access_level"
            type="number"
            min="1"
            value={form.access_level}
            onChange={handleChange}
            required
          />
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : `Create ${role === 'admin' ? 'Admin' : 'Client'}`}
        </Button>
      </div>
    </form>
  );
}
