import { Modal, Button } from './ui';

export default function PetDetailsModal({ open, onClose, pet }) {
  if (!pet) return null;
  return (
    <Modal open={open} onClose={onClose} labelledBy={`pet-details-title-${pet.id}`}>
      <div className="px-5 py-4 border-b border-(--color-border) shrink-0">
        <h2
          id={`pet-details-title-${pet.id}`}
          className="text-lg font-semibold text-(--color-foreground)"
        >
          Pet Details
        </h2>
      </div>
      <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
        <div className="h-48 rounded-lg bg-(--color-muted) flex items-center justify-center overflow-hidden">
          {pet.photo_url ? (
            <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">🐾</span>
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-(--color-foreground)">{pet.name}</h3>
          <p className="text-sm text-(--color-muted-foreground)">
            {pet.species}
            {pet.breed ? ` · ${pet.breed}` : ''}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {pet.age != null && (
            <div>
              <dt className="text-(--color-muted-foreground) text-xs">Age</dt>
              <dd className="text-(--color-foreground)">{pet.age}</dd>
            </div>
          )}
          {pet.weight != null && (
            <div>
              <dt className="text-(--color-muted-foreground) text-xs">Weight</dt>
              <dd className="text-(--color-foreground)">{pet.weight} kg</dd>
            </div>
          )}
        </dl>
        {pet.notes && (
          <div>
            <p className="text-xs text-(--color-muted-foreground) mb-1">Notes</p>
            <p className="text-sm text-(--color-foreground) italic whitespace-pre-wrap">
              {pet.notes}
            </p>
          </div>
        )}
      </div>
      <div className="px-5 py-4 border-t border-(--color-border) flex justify-end shrink-0 bg-(--color-background)">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </div>
    </Modal>
  );
}
