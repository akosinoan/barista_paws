import { Link } from 'react-router-dom';
import { PawPrint, UserPlus, CalendarClock } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { Button, Card } from '../components/ui';

export default function LandingPage() {
  const { isLoggedIn, isAdmin } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-14 sm:py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <PawPrint size={60} className="text-(--color-primary)" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-(--color-foreground)">
            Welcome to{' '}
            <span className="text-(--color-primary)">Barista Paws</span>
          </h1>
          <p className="mt-5 text-lg text-(--color-muted-foreground) max-w-xl mx-auto">
            Your pets deserve the best. Register, manage their profiles, and schedule grooming appointments — all in one place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <Button as={Link} to={isAdmin ? '/admin/users' : '/dashboard'} size="lg" className="no-underline font-semibold">
                {isAdmin ? 'Go to Dashboard' : 'My Dashboard'}
              </Button>
            ) : (
              <>
                <Button as={Link} to="/register" size="lg" className="no-underline font-semibold">
                  Get Started
                </Button>
                <Button as={Link} to="/login" variant="outline" size="lg" className="no-underline font-semibold">
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-10 sm:py-16 px-4 bg-(--color-muted)">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 text-(--color-foreground)">
            Everything your pet needs
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              icon={<UserPlus size={30} />}
              title="Easy Registration"
              description="Sign up in seconds and start managing your pets right away. No paper forms needed."
            />
            <FeatureCard
              icon={<PawPrint size={30} />}
              title="Pet Profiles"
              description="Keep all your pet's info — breed, age, weight, photos — organized and accessible."
            />
            <FeatureCard
              icon={<CalendarClock size={30} />}
              title="Appointments"
              description="Schedule grooming sessions and get reminders. Coming soon!"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-sm text-(--color-muted-foreground) border-t border-(--color-border)">
        <p>&copy; 2026 Barista Paws. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <Card className="p-6 text-center">
      <div className="flex justify-center text-(--color-primary) mb-4">{icon}</div>
      <h3 className="text-base font-semibold mb-2 text-(--color-foreground)">{title}</h3>
      <p className="text-sm text-(--color-muted-foreground)">{description}</p>
    </Card>
  );
}
