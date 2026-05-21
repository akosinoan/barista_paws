import { useRef } from 'react';
import { Pencil, Trash2, Camera } from 'lucide-react';
import { Button } from './ui';

export default function PetCard({ pet, onEdit, onDelete, onUploadPhoto }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadPhoto) {
      onUploadPhoto(pet.id, file);
      e.target.value = '';
    }
  };

  return (
    <div className="border border-(--color-border) rounded-lg overflow-hidden bg-(--color-card) text-(--color-card-foreground)">
      {/* Photo area */}
      <div className="relative h-40 bg-(--color-muted) flex items-center justify-center">
        {pet.photo_url
          ? <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
          : <span className="text-5xl">🐾</span>
        }
        {onUploadPhoto && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer"
              title="Upload photo"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">
              {pet.name}
              {pet.deleted_at && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-(--color-destructive) text-(--color-destructive-foreground) font-medium align-middle">
                  Deleted
                </span>
              )}
            </h3>
            <p className="text-sm text-(--color-muted-foreground)">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(pet)} aria-label="Edit pet">
                  <Pencil size={16} />
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" size="icon" onClick={() => onDelete(pet.id)} aria-label="Delete pet">
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {pet.age != null && (
            <div>
              <span className="text-(--color-muted-foreground)">Age:</span> {pet.age}
            </div>
          )}
          {pet.weight != null && (
            <div>
              <span className="text-(--color-muted-foreground)">Weight:</span> {pet.weight} kg
            </div>
          )}
        </div>
        {pet.notes && (
          <p className="mt-2 text-sm text-(--color-muted-foreground) italic">{pet.notes}</p>
        )}
      </div>
    </div>
  );
}
