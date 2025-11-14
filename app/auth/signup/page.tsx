"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      if (!email || !password) {
        throw new Error("Please fill in all fields")
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters")
      }

      const supabase = getSupabaseClient()

      // signup without email confirmation redirect option
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!data?.user) {
        throw new Error("Signup failed")
      }

      // Immediate success toast (no "check your email" flow)
      toast({
        title: "Success",
        description: "Account created successfully!",
      })

      // Redirect to dashboard (change this path if you'd like a different landing)
      router.push("/auth/login")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred during signup"
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm">
        <Card className="border-rose-200 shadow-lg backdrop-blur-sm bg-white/90">
          <CardHeader>
            <CardTitle className="text-2xl text-rose-900">Create Your Studio</CardTitle>
            <CardDescription>Join Creative Studio to start generating beauty ads</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-rose-900">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="border-rose-200 focus:border-rose-400 focus:ring-rose-400"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-rose-900">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="border-rose-200 focus:border-rose-400 focus:ring-rose-400"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password" className="text-rose-900">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="border-rose-200 focus:border-rose-400 focus:ring-rose-400"
                />
              </div>
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
              <div className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-rose-600 font-semibold hover:text-rose-700 underline underline-offset-4"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// "use client"

// import type React from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { useToast } from "@/hooks/use-toast"
// import Link from "next/link"
// import { useRouter } from 'next/navigation'
// import { useState } from "react"
// import { getSupabaseClient } from "@/lib/supabase/client"

// export default function SignupPage() {
//   const [email, setEmail] = useState("")
//   const [password, setPassword] = useState("")
//   const [confirmPassword, setConfirmPassword] = useState("")
//   const [error, setError] = useState<string | null>(null)
//   const [isLoading, setIsLoading] = useState(false)
//   const router = useRouter()
//   const { toast } = useToast()

//   const handleSignup = async (e: React.FormEvent) => {
//     e.preventDefault()
//     setError(null)

//     if (password !== confirmPassword) {
//       setError("Passwords do not match")
//       return
//     }

//     setIsLoading(true)

//     try {
//       if (!email || !password) {
//         throw new Error("Please fill in all fields")
//       }

//       if (password.length < 6) {
//         throw new Error("Password must be at least 6 characters")
//       }

//       const supabase = getSupabaseClient()

//       const { data, error: authError } = await supabase.auth.signUp({
//         email,
//         password,
//         options: {
//           emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
//         },
//       })

//       if (authError) {
//         throw new Error(authError.message)
//       }

//       if (!data.user) {
//         throw new Error("Signup failed")
//       }

//       toast({
//         title: "Success",
//         description: "Please check your email to confirm your account",
//       })

//       router.push("/auth/signup-success")
//     } catch (error: unknown) {
//       const errorMessage = error instanceof Error ? error.message : "An error occurred during signup"
//       setError(errorMessage)
//       toast({
//         title: "Error",
//         description: errorMessage,
//         variant: "destructive",
//       })
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   return (
//     <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
//       <div className="w-full max-w-sm">
//         <Card className="border-rose-200 shadow-lg backdrop-blur-sm bg-white/90">
//           <CardHeader>
//             <CardTitle className="text-2xl text-rose-900">Create Your Studio</CardTitle>
//             <CardDescription>Join Creative Studio to start generating beauty ads</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <form onSubmit={handleSignup} className="flex flex-col gap-6">
//               <div className="grid gap-2">
//                 <Label htmlFor="email" className="text-rose-900">
//                   Email
//                 </Label>
//                 <Input
//                   id="email"
//                   type="email"
//                   placeholder="you@example.com"
//                   required
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   disabled={isLoading}
//                   className="border-rose-200 focus:border-rose-400 focus:ring-rose-400"
//                 />
//               </div>
//               <div className="grid gap-2">
//                 <Label htmlFor="password" className="text-rose-900">
//                   Password
//                 </Label>
//                 <Input
//                   id="password"
//                   type="password"
//                   placeholder="••••••••"
//                   required
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   disabled={isLoading}
//                   className="border-rose-200 focus:border-rose-400 focus:ring-rose-400"
//                 />
//               </div>
//               <div className="grid gap-2">
//                 <Label htmlFor="confirm-password" className="text-rose-900">
//                   Confirm Password
//                 </Label>
//                 <Input
//                   id="confirm-password"
//                   type="password"
//                   placeholder="••••••••"
//                   required
//                   value={confirmPassword}
//                   onChange={(e) => setConfirmPassword(e.target.value)}
//                   disabled={isLoading}
//                   className="border-rose-200 focus:border-rose-400 focus:ring-rose-400"
//                 />
//               </div>
//               {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
//               <Button
//                 type="submit"
//                 className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
//                 disabled={isLoading}
//               >
//                 {isLoading ? "Creating account..." : "Create account"}
//               </Button>
//               <div className="text-center text-sm text-gray-600">
//                 Already have an account?{" "}
//                 <Link
//                   href="/auth/login"
//                   className="text-rose-600 font-semibold hover:text-rose-700 underline underline-offset-4"
//                 >
//                   Sign in
//                 </Link>
//               </div>
//             </form>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   )
// }
