'use client';

import { useAuthContext } from '@/components/providers/AuthProvider';

export default function LogoutButton() {
  const { logout } = useAuthContext();
  
  return (
    <button 
      type="button" 
      onClick={() => logout()}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition w-full"
    >
      Sign Out
    </button>
  );
}
