import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  getUser, updateUser, changePassword, uploadUserAvatar,
} from '../lib/api';
import { Pencil, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Button, Input, Label, Alert, Card, CardHeader, CardBody, Avatar } from '../components/ui';
import { Skeleton } from '../components/ui/LoadingState';

function ProfileSection({ userId }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  const [showPw, setShowPw] = useState(false);
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    getUser(userId).then((res) => {
      if (res.success && res.data) {
        setProfile(res.data);
        setAvatarUrl(res.data.avatar_url || null);
        setForm({
          email: res.data.email || '',
          first_name: res.data.first_name || '',
          last_name: res.data.last_name || '',
          phone_number: res.data.phone_number || '',
          address: res.data.address || '',
        });
      }
    });
  }, [userId]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const res = await uploadUserAvatar(userId, file);
    setAvatarUploading(false);
    if (res.success) setAvatarUrl(res.data.url);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await updateUser(userId, {
      email: form.email || null,
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      phone_number: form.phone_number || null,
      address: form.address || null,
    });
    setSaving(false);
    if (res.success) {
      setProfile((p) => ({ ...p, ...form }));
      setEditing(false);
    } else {
      setError(res.message || 'Update failed');
    }
  };

  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match'); return; }
    if (pwForm.new_password.length < 6) { setPwError('Minimum 6 characters'); return; }
    setPwSaving(true);
    const res = await changePassword(userId, {
      current_password: pwForm.current_password,
      new_password: pwForm.new_password,
    });
    setPwSaving(false);
    if (res.success) {
      setPwSuccess('Password updated');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setShowPw(false);
    } else {
      setPwError(res.message || 'Failed to update password');
    }
  };

  if (!profile) {
    return <Skeleton className="h-32" />;
  }

  return (
    <Card>
      <CardHeader
        title="My Profile"
        action={!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={14} /> Edit
          </Button>
        )}
      />

      <CardBody className="space-y-6">
        {/* Avatar row */}
        <div className="flex items-center gap-4">
          <Avatar src={avatarUrl} alt="avatar" />
          <div>
            <p className="font-semibold text-(--color-foreground)">{profile.first_name} {profile.last_name}</p>
            <p className="text-sm text-(--color-muted-foreground)">{profile.email}</p>
            <label className={`mt-2 inline-block text-xs px-3 py-1 rounded-lg border border-(--color-border) text-(--color-foreground) hover:bg-(--color-muted) transition-colors cursor-pointer ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              {avatarUploading ? 'Uploading...' : 'Change Photo'}
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
        </div>

        {/* Read-only view */}
        {!editing && (
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <InfoRow label="Phone" value={profile.phone_number} />
            <InfoRow label="Address" value={profile.address} />
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <Alert>{error}</Alert>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); setError(''); }}>
                <X size={14} /> Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                <Check size={14} /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        )}

        {/* Change password */}
        <div className="border-t border-(--color-border) pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setShowPw((v) => !v); setPwError(''); setPwSuccess(''); }}
          >
            {showPw ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Change Password
          </Button>

          <Alert variant="success" className="mt-2">{pwSuccess}</Alert>

          {showPw && (
            <form onSubmit={handlePwSubmit} className="mt-3 space-y-3">
              <Alert>{pwError}</Alert>
              <div>
                <Label>Current Password</Label>
                <Input type="password" required value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
              </div>
              <div>
                <Label>New Password</Label>
                <Input type="password" required value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input type="password" required value={pwForm.confirm_password} onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={pwSaving}>
                  {pwSaving ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-(--color-muted-foreground)">{label}: </span>
      <span className="text-(--color-foreground)">{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-(--color-background)">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-(--color-foreground)">My Profile</h1>
        <ProfileSection userId={user.id} />
      </div>
    </div>
  );
}
