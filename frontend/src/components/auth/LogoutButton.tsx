'use client'

import { useAuthContext } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const { logout } = useAuthContext()

  return (
    <Button
      type="button"
      onClick={() => logout()}
      variant="ghost"
      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign out
    </Button>
  )
}
