'use client'

import { useAuth } from './AuthProvider'
import { Button } from './ui/button'

export default function UserInfo() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">{user.email}</span>
      <Button onClick={signOut} variant="outline" size="sm">
        Sign Out
      </Button>
    </div>
  )
}