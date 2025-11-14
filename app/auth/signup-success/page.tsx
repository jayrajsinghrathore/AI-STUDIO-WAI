import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="w-full max-w-sm">
        <Card className="border-rose-200 shadow-lg backdrop-blur-sm bg-white/90">
          <CardHeader>
            <CardTitle className="text-2xl text-rose-900">Check Your Email</CardTitle>
            <CardDescription>Confirmation link sent to your inbox</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-gray-700">
              Please click the confirmation link in your email to activate your account. After confirming, you can sign
              in and start creating beautiful ad images.
            </p>
            <Link
              href="/auth/login"
              className="text-rose-600 hover:text-rose-700 underline underline-offset-4 font-semibold text-sm"
            >
              Back to login
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
