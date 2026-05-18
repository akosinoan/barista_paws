import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { getUser, updateUser, changePassword, uploadUserAvatar } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { Button, Input, Label, Alert, Card, Avatar, LoadingState } from '../components/ui';

export default function EditUserPage({ userId: userIdProp, onDone, embedded = false }) {
  const params = useParams();
  const userId = userIdProp || params.userId;
  const navigate = useNavigate();
  const { user: authUser, isAdmin } = useAuth();

  const finish = () => {
    if (onDone) onDone();
    else navigate(isAdmin ? '/admin/users' : '/dashboard');
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isAdmin && authUser?.id !== userId) {
    return <Navigate to="/" replace />;
  }

  const isSelf = authUser?.id === userId;

  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    address: '',
  });

  const [showPwForm, setShowPwForm] = useState(false);
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const res = await getUser(userId);
      if (res.success && res.data) {
        setForm({
          email: res.data.email || '',
          first_name: res.data.first_name || '',
          last_name: res.data.last_name || '',
          phone_number: res.data.phone_number || '',
          address: res.data.address || '',
        });
        setAvatarUrl(res.data.avatar_url || null);
      }
      setLoading(false);
    };
    fetchUser();
  }, [userId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await updateUser(userId, {
      email: form.email || null,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      phone_number: form.phone_number || null,
      address: form.address || null,
    });
    if (res.success) {
      finish();
    } else {
      setError(res.message || 'Update failed');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const res = await uploadUserAvatar(userId, file);
    setAvatarUploading(false);
    if (res.success) setAvatarUrl(res.data.url);
  };

  const handlePwChange = (e) => {
    setPwForm({ ...pwForm, [e.target.name]: e.target.value });
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('New passwords do not match');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }

    setPwLoading(true);
    const body = { new_password: pwForm.new_password };
    if (isSelf) body.current_password = pwForm.current_password;

    const res = await changePassword(userId, body);
    setPwLoading(false);

    if (res.success) {
      setPwSuccess('Password updated successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPwForm(false);
    } else {
      setPwError(res.message || 'Failed to update password');
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className={embedded ? 'space-y-6' : 'max-w-md mx-auto px-4 py-8 space-y-8'}>
      {!embedded && (
        <h1 className="text-3xl font-bold text-(--color-foreground)">Edit User</h1>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <Avatar src={avatarUrl} alt="Avatar" />
        <label className={`px-4 py-2 rounded-lg border border-(--color-border) text-sm text-(--color-foreground) hover:bg-(--color-muted) transition-colors cursor-pointer ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {avatarUploading ? 'Uploading...' : 'Upload Photo'}
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
        </label>
      </div>

      {/* Profile form */}
      <Alert>{error}</Alert>
      <Alert variant="success">{success}</Alert>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-(--color-foreground)">Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input name="first_name" value={form.first_name} onChange={handleChange} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input name="last_name" value={form.last_name} onChange={handleChange} />
            </div>
          </div>

          <div>
            <Label>Email</Label>
            <Input name="email" type="email" value={form.email} onChange={handleChange} />
          </div>

          <div>
            <Label>Phone Number</Label>
            <Input name="phone_number" value={form.phone_number} onChange={handleChange} />
          </div>

          <div>
            <Label>Address</Label>
            <Input name="address" value={form.address} onChange={handleChange} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={finish}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Change password section */}
      <Card>
        <div className="flex items-center justify-between p-6">
          <h2 className="text-lg font-semibold text-(--color-foreground)">Change Password</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowPwForm((v) => !v);
              setPwError('');
              setPwSuccess('');
              setPwForm({ current_password: '', new_password: '', confirm_password: '' });
            }}
          >
            {showPwForm ? 'Cancel' : 'Change Password'}
          </Button>
        </div>

        <Alert variant="success" className="mx-6 mb-4">{pwSuccess}</Alert>

        {showPwForm && (
          <form onSubmit={handlePwSubmit} className="px-6 pb-6 space-y-4">
            <Alert>{pwError}</Alert>

            {isSelf && (
              <div>
                <Label>Current Password</Label>
                <Input name="current_password" type="password" value={pwForm.current_password} onChange={handlePwChange} required />
              </div>
            )}

            <div>
              <Label>New Password</Label>
              <Input name="new_password" type="password" value={pwForm.new_password} onChange={handlePwChange} required />
            </div>

            <div>
              <Label>Confirm New Password</Label>
              <Input name="confirm_password" type="password" value={pwForm.confirm_password} onChange={handlePwChange} required />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={pwLoading}>
                {pwLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
