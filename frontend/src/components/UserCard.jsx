import { Link } from 'react-router-dom';
import { Pencil, Trash2, PawPrint, CalendarPlus } from 'lucide-react';
import { Button, Avatar } from './ui';

export default function UserCard({ user, pets = [], onDelete, onRequestAppointment }) {
  return (
    <div className="border border-(--color-border) rounded-lg p-4 bg-(--color-card) text-(--color-card-foreground)">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar src={user.avatar_url} alt={user.first_name} size="sm" />
          <div className="min-w-0">
            <h3 className="font-semibold text-(--color-foreground) truncate">{user.first_name} {user.last_name}</h3>
            <p className="text-sm text-(--color-muted-foreground) truncate">{user.email}</p>
            {user.phone_number && <p className="text-sm text-(--color-muted-foreground) truncate">{user.phone_number}</p>}
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-(--color-secondary) text-(--color-secondary-foreground) capitalize">
              {user.role}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="icon" as={Link} to={`/admin/users/${user.id}/edit`} title="Edit user">
            <Pencil size={16} />
          </Button>
          <Button variant="destructive" size="icon" onClick={() => onDelete(user.id)} title="Delete user">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
      {onRequestAppointment && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRequestAppointment(user)}
            className="w-full"
            title="Request an appointment for this customer"
          >
            <CalendarPlus size={16} /> Request Appointment
          </Button>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-(--color-border)">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-(--color-muted-foreground)">Pets</p>
          <Button size="xs" as={Link} to={`/admin/users/${user.id}/pets`} title="Manage pets" className="no-underline">
            <PawPrint size={16} /> Manage Pets
          </Button>
        </div>
        {pets.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {pets.map((pet) => (
              <Link
                key={pet.id}
                to={`/admin/users/${user.id}/pets`}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-(--color-secondary) text-(--color-secondary-foreground) no-underline hover:opacity-80 transition-opacity"
              >
                <PawPrint size={12} /> {pet.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-(--color-muted-foreground)">No pets registered yet</p>
        )}
      </div>
    </div>
  );
}
