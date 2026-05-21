import { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { getPetsByOwner, getUser } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import PetsSection from '../components/PetsSection';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui';

export default function PetsPage({ userId: userIdProp, onDone, embedded = false }) {
  const params = useParams();
  const userId = userIdProp || params.userId;
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const isOwnPage = user?.id === userId;
  const canView = isAdmin || isOwnPage;
  const canEdit = canView;

  useEffect(() => {
    if (!canView) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      getPetsByOwner(userId, { includeDeleted: isAdmin && includeDeleted }),
      getUser(userId),
    ]).then(([petsRes, userRes]) => {
      if (petsRes.success) {
        setPets(petsRes.data || []);
      } else {
        setAccessDenied(true);
      }
      if (userRes.success) setOwner(userRes.data);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, includeDeleted]);

  if (accessDenied) {
    return <Navigate to={`/users/${user.id}/pets`} replace />;
  }

  const title = owner ? (isOwnPage ? 'My Pets' : `${owner.first_name}'s Pets`) : 'Pets';
  const emptyMessage = `No pets registered yet.${canEdit ? ' Click "Add Pet" to get started!' : ''}`;

  return (
    <div className={embedded ? '' : 'max-w-4xl mx-auto px-4 py-8'}>
      {isAdmin && !embedded && (
        <Button variant="ghost" size="sm" onClick={() => (onDone ? onDone() : navigate(-1))} className="mb-4">
          <ArrowLeft size={16} /> Back
        </Button>
      )}
      {isAdmin && (
        <label className="inline-flex items-center gap-2 text-sm text-(--color-muted-foreground) cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            className="rounded border-(--color-input)"
          />
          Show deleted pets
        </label>
      )}
      <PetsSection
        userId={userId}
        pets={pets}
        setPets={setPets}
        loading={loading}
        title={title}
        canEdit={canEdit}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
