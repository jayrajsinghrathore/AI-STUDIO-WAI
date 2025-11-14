import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Sparkles, Download, Palette } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <header className="border-b border-rose-200/50 backdrop-blur-sm bg-white/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
            Creative Studio
          </h1>
          <nav className="flex gap-4">
            <Link href="/auth/login" className="px-4 py-2 text-rose-600 font-medium hover:text-rose-700 transition">
              Login
            </Link>
            <Button
              asChild
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
            >
              <Link href="/studio">
                Enter Studio
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6">
        {/* Hero Section */}
        <div className="py-20 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-6xl md:text-7xl font-bold text-gray-900 leading-tight">
              AI-Powered Beauty
              <br />
              <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                Ad Generator
              </span>
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
              Create stunning beauty product advertisements in seconds. Enhance your prompts with AI and generate
              professional-quality images instantly.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-center pt-4">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-base h-12 px-8"
            >
              <Link href="/studio">
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started Free
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 text-base h-12 px-8 bg-transparent"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group p-8 rounded-2xl bg-white border border-rose-100 hover:border-rose-300 shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-4 group-hover:from-rose-200 group-hover:to-pink-200 transition">
              <Sparkles className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Enhance Prompts</h3>
            <p className="text-gray-700 leading-relaxed">
              Use Google Gemini AI to automatically enhance your prompts with professional photography details,
              lighting, composition, and style keywords.
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-white border border-rose-100 hover:border-rose-300 shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-4 group-hover:from-rose-200 group-hover:to-pink-200 transition">
              <Palette className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Generate Images</h3>
            <p className="text-gray-700 leading-relaxed">
              Generate stunning, professional-quality images using Banana.dev AI. Choose from multiple style presets:
              Photorealistic, Oil Painting, Social Ad, or Catalog.
            </p>
          </div>

          <div className="group p-8 rounded-2xl bg-white border border-rose-100 hover:border-rose-300 shadow-lg hover:shadow-xl transition-all hover:scale-105 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-4 group-hover:from-rose-200 group-hover:to-pink-200 transition">
              <Download className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Manage & Export</h3>
            <p className="text-gray-700 leading-relaxed">
              View all your generated images in a beautiful gallery, download in high resolution, and organize your
              creative work with ease.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-r from-rose-500 to-pink-500 text-white space-y-6">
            <h3 className="text-3xl md:text-4xl font-bold">Ready to Create?</h3>
            <p className="text-lg text-white/90 max-w-xl mx-auto">
              Start generating beautiful beauty product ads with AI today. No credit card required.
            </p>
            <Button asChild size="lg" className="bg-white text-rose-600 hover:bg-gray-100 text-base h-12 px-8">
              <Link href="/studio">
                Launch Studio
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-rose-200/50 py-8 text-center text-gray-600">
        <p>Creative Studio © 2025. Powered by Google Gemini & Banana.dev.</p>
      </footer>
    </div>
  )
}
