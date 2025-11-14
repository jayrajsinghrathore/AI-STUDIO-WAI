"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"

interface User {
  id: string
  email?: string
}

export function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase.auth.getUser()
        setUser(
          data.user
            ? {
                id: data.user.id,
                email: data.user.email,
              }
            : null
        )
      } catch (error) {
        console.error("Failed to fetch user:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  if (isLoading) {
    return (
      <header className="border-b border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent"
          >
            Creative Studio
          </Link>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent hover:opacity-80 transition"
        >
          Creative Studio
        </Link>
        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <span className="text-sm text-gray-600">{user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Logout
              </Button>
            </>
          ) : (
            <Link href="/auth/login" className="text-sm font-medium text-rose-600 hover:text-rose-700">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
