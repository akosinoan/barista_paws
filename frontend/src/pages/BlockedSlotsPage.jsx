import BlockedSlotManager from '../components/BlockedSlotManager';
import { Card, CardHeader, CardBody } from '../components/ui';

export default function BlockedSlotsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-(--color-foreground)">Blocked Timeslots</h1>
        <p className="text-sm text-(--color-muted-foreground) mt-1">
          Block or unblock specific timeslots to prevent client bookings.
        </p>
      </div>

      <Card>
        <CardHeader title="Blocked Timeslots" />
        <CardBody>
          <BlockedSlotManager />
        </CardBody>
      </Card>
    </div>
  );
}
