"use client"

import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Download, Trash2, Eye } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface Generation {
  id: string
  imageUrl: string
  enhancedPrompt: string
  stylePreset?: string
  created_at: string
}

export default function GenerationsPage() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null)
  const { toast } = useToast()

  // useEffect(() => {
  //   // Mock data - in production, fetch from API
  //   setGenerations([
  //     {
  //       id: "1",
  //       imageUrl: "/luxury-beauty-product-photography.jpg",
  //       enhancedPrompt: "Luxurious beauty cream advertisement with elegant packaging",
  //       stylePreset: "Photorealistic",
  //       created_at: new Date().toISOString(),
  //     },
  //     {
  //       id: "2",
  //       imageUrl: "/premium-perfume-bottle-advertisement.jpg",
  //       enhancedPrompt: "Premium perfume bottle with sophisticated background",
  //       stylePreset: "Oil Painting",
  //       created_at: new Date(Date.now() - 86400000).toISOString(),
  //     },
  //   ])
  //   setIsLoading(false)
  // }, [])

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `beauty-ad-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast({
        title: "Success",
        description: "Image downloaded",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      })
    }
  }

  const handleDelete = (id: string) => {
    setGenerations((prev) => prev.filter((gen) => gen.id !== id))
    toast({
      title: "Success",
      description: "Image deleted",
    })
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Your Gallery
          </h1>
          <p className="text-gray-600">View and manage all your generated beauty ad images</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-600 font-medium">Loading gallery...</p>
          </div>
        ) : generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border-2 border-dashed border-rose-200">
            <div className="text-center space-y-4">
              <div className="text-5xl">📸</div>
              <p className="text-lg font-semibold text-gray-900">No images yet</p>
              <p className="text-gray-600 max-w-sm">Start creating beautiful beauty ads in the studio</p>
              <Button
                asChild
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
              >
                <a href="/studio">Go to Studio</a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generations.map((gen) => (
              <div
                key={gen.id}
                className="group relative overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100">
                  <Image
                    src={gen.imageUrl || "/placeholder.svg"}
                    alt="Generated ad"
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedImage(gen)}
                      className="bg-white/90 hover:bg-white text-gray-900"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(gen.imageUrl)}
                      className="bg-white/90 hover:bg-white text-gray-900"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(gen.id)}
                      className="bg-red-500/90 hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Info Footer */}
                <div className="p-4 bg-white space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {gen.stylePreset && (
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 rounded-full">
                        {gen.stylePreset}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{new Date(gen.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{gen.enhancedPrompt}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl font-bold"
            >
              ✕
            </button>
            <Image
              src={selectedImage.imageUrl || "/placeholder.svg"}
              alt="Fullscreen view"
              width={1024}
              height={1024}
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
            <div className="mt-6 p-4 bg-white/10 backdrop-blur-md rounded-xl text-white border border-white/20">
              <p className="text-sm leading-relaxed">{selectedImage.enhancedPrompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
