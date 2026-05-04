import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient, login } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { Button, Input, Label, Alert, Card } from '../components/ui';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
    vip_card_number: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        ...form,
        phone_number: form.phone_number || null,
        address: form.address || null,
        vip_card_number: form.vip_card_number || null,
      };

      const res = await createClient(data);
      if (res.success) {
        const loginRes = await login(form.email, form.password);
        if (loginRes.success && loginRes.data) {
          loginUser(loginRes.data.token, loginRes.data.user);
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-(--color-foreground)">Create Account</h1>

        <Alert className="mb-4">{error}</Alert>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
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
              <Input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} />
            </div>

            <div>
              <Label>Phone Number</Label>
              <Input name="phone_number" value={form.phone_number} onChange={handleChange} />
            </div>

            <div>
              <Label>Address</Label>
              <Input name="address" value={form.address} onChange={handleChange} />
            </div>

            <div>
              <Label>VIP Card Number</Label>
              <Input name="vip_card_number" value={form.vip_card_number} onChange={handleChange} placeholder="Optional" />
            </div>

            <Button type="submit" size="full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Register'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-(--color-muted-foreground)">
          Already have an account?{' '}
          <Link to="/login" className="text-(--color-primary) hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
