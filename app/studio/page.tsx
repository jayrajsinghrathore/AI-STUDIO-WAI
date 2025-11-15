"use client"

import { Header } from "@/components/header"
import { PromptInput } from "@/components/prompt-input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Download, Trash2, Eye, RefreshCw } from 'lucide-react'
import Image from "next/image"
import { useEffect, useState, useCallback } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { AnimatedBg } from "@/components/animated-bg"

interface Generation {
  id: string
  image_urls: string[]
  enhanced_prompt: string
  original_prompt: string
  style_preset?: string
  created_at: string
}

export default function StudioPage() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGallery, setIsLoadingGallery] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [selectedImage, setSelectedImage] = useState<Generation | null>(null)
  const [user, setUser] = useState<any>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)

    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    fetchGenerations()
  }, [])

  const fetchGenerations = useCallback(async (pageOffset = 0) => {
    try {
      setIsLoadingGallery(true)
      const response = await fetch(`/api/gallery?limit=20&offset=${pageOffset}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch gallery")
      }

      const { generations: data, total } = await response.json()

      if (pageOffset === 0) {
        setGenerations(data)
      } else {
        setGenerations((prev) => [...prev, ...data])
      }

      setOffset(pageOffset + 20)
      setHasMore((pageOffset + 20) < total)
    } catch (error) {
      console.error("Fetch error:", error)
      toast({
        title: "Error",
        description: "Failed to load gallery",
        variant: "destructive",
      })
    } finally {
      setIsLoadingGallery(false)
    }
  }, [toast])

  const handleGenerate = async (enhancedPrompt: string, stylePreset: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          enhancedPrompt,
          stylePreset,
          numVariations: 1,
        }),
      });
  
      if (!response.ok) {
        // read body safely (try JSON first, then fallback to text)
        let serverDetail = "";
        let parsedJson: any = null;
        let rawText = "";
  
        try {
          parsedJson = await response.json();
          // parsedJson may be {} — convert to informative string
          serverDetail = parsedJson?.error ?? parsedJson?.message ?? parsedJson?.details ?? JSON.stringify(parsedJson);
        } catch (jsonErr) {
          // not JSON — read plain text
          try {
            rawText = await response.text();
            serverDetail = rawText || response.statusText || "";
          } catch {
            serverDetail = response.statusText || "";
          }
        }
  
        // Extra diagnostic info: content-type and headers (truncated)
        const contentType = response.headers.get("content-type") ?? "unknown";
        console.error("[Generate] failed", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          serverDetail: serverDetail?.toString().slice(0, 2000),
          // full parsed Json only in dev mode
          parsedJson: parsedJson && process.env.NODE_ENV !== "production" ? parsedJson : undefined,
        });
  
        // Map status to friendly message for users
        let userMessage = "Image generation failed.";
        if (response.status === 401 || response.status === 403) {
          userMessage = "Authentication error: check server API key / permissions.";
        } else if (response.status === 404) {
          userMessage = "Endpoint not found: check the model name or API path.";
        } else if (response.status === 429) {
          userMessage = "Quota exceeded or rate limited: try again later or enable billing.";
        } else if (response.status >= 500) {
          userMessage = "Server error from the image provider — try again later.";
        }
  
        // Throw a concise message (includes status) but console already has full detail
        throw new Error(`${userMessage} (${response.status})`);
      }
  
      const data = await response.json();
  
      if (!data.imageUrls || data.imageUrls.length === 0) {
        throw new Error("No image URLs returned");
      }
  
      // await fetchGenerations(0)
      setGenerations((prev: Generation[]) => [
        ...prev,
        {
          id: "5",
          image_urls: [data.imageUrls[0]],   // ← MUST be array
          enhanced_prompt: enhancedPrompt,
          original_prompt: enhancedPrompt,
          style_preset: "",
          created_at: new Date().toISOString(),
        },
      ])
      
      console.log(data)
  
      toast({
        title: "Success",
        description: "Image generated successfully!",
      });
    } catch (error) {
      console.error("Generate error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  
       

 

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

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch("/api/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: id }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete")
      }

      setGenerations((prev) => prev.filter((gen) => gen.id !== id))
      toast({
        title: "Success",
        description: "Image deleted",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      })
    }
  }

  if (!isClient) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 relative overflow-hidden">
      <AnimatedBg />
      <Header />
      <main className="mx-auto max-w-7xl px-4 md:px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                  Create Your Ad
                </h2>
                <PromptInput onEnhance={() => {}} onGenerate={handleGenerate} isLoading={isLoading} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Gallery</h2>
              <Button
                onClick={() => fetchGenerations(0)}
                disabled={isLoadingGallery}
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {isLoadingGallery ? "Loading..." : "Refresh"}
              </Button>
            </div>

            {generations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-white to-rose-50 rounded-2xl border-2 border-dashed border-rose-200">
                <div className="text-center space-y-3">
                  <div className="text-4xl">✨</div>
                  <p className="text-lg font-medium text-gray-900">No images yet</p>
                  <p className="text-sm text-gray-600 max-w-xs">
                    Create your first beauty ad image using the editor on the left
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generations.map((gen) => {
                    const imageUrl = (gen.image_urls) ? `data:image/png;base64,${(gen.image_urls[0])}` : null
                    console.log(gen.image_urls, "thisis gen rendering")
                    return (
                      <div
                        key={gen.id}
                        className="group relative overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
                      >
                        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100">
                          <img
                            src={imageUrl || "/placeholder.svg?height=1024&width=1024"}
                            alt="Generated ad"
                            
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
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
                              onClick={() => handleDownload(imageUrl)}
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

                        <div className="p-3 bg-white space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            {gen.style_preset && (
                              <span className="inline-block px-2 py-1 text-xs font-semibold bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 rounded-full">
                                {gen.style_preset}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(gen.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{gen.enhanced_prompt}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <Button
                      onClick={() => fetchGenerations(offset)}
                      disabled={isLoadingGallery}
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      {isLoadingGallery ? "Loading more..." : "Load More"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl"
            >
              ✕
            </button>
            <Image
              src={Array.isArray(selectedImage.image_urls) ? selectedImage.image_urls[0] : selectedImage.image_urls || "/placeholder.svg?height=1024&width=1024"}
              alt="Fullscreen view"
              width={1024}
              height={1024}
              className="w-full h-auto rounded-xl"
            />
            <div className="mt-4 p-4 bg-white/10 backdrop-blur rounded-xl text-white">
              <p className="text-sm">{selectedImage.enhanced_prompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
