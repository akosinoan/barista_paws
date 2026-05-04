import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import Button from './ui/Button';

export default function LogOutButton({ onAfterLogout, showLabel = true, variant = 'outline', size = 'sm', className = '' }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    onAfterLogout?.();
  };

  return (
    <Button variant={variant} size={size} onClick={handleLogout} title="Log Out" className={className}>
      <LogOut size={18} /> {showLabel && 'Log Out'}
    </Button>
  );
}
