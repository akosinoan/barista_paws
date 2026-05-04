import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { login } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { Button, Input, Label, Alert, Card } from '../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(form.email, form.password);
      if (res.success && res.data) {
        loginUser(res.data.token, res.data.user);
        navigate(res.data.user.role === 'admin' ? '/admin/users' : '/dashboard');
      } else {
        setError(res.message || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <PawPrint size={40} className="text-(--color-primary)" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-8 text-(--color-foreground)">Welcome back</h1>

        <Alert className="mb-4">{error}</Alert>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <Label>Password</Label>
              <Input name="password" type="password" value={form.password} onChange={handleChange} required />
            </div>
            <Button type="submit" size="full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-(--color-muted-foreground)">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-(--color-primary) hover:underline font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
