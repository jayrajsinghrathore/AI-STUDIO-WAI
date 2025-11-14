"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { useState } from "react"

interface Generation {
  id: string
  image_url: string
  enhanced_prompt: string
  created_at: string
}

interface GenerationsClientProps {
  initialGenerations: Generation[]
  userId: string
}

export function GenerationsClient({ initialGenerations, userId }: GenerationsClientProps) {
  const [generations, setGenerations] = useState(initialGenerations)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    setLoadingId(id)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("generations").delete().eq("id", id).eq("user_id", userId)

      if (error) throw error

      setGenerations((prev) => prev.filter((gen) => gen.id !== id))
      toast({
        title: "Success",
        description: "Image deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete image",
        variant: "destructive",
      })
    } finally {
      setLoadingId(null)
    }
  }

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ad-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {generations.map((generation) => (
        <div key={generation.id} className="group relative overflow-hidden rounded-lg border">
          <Image
            src={generation.image_url || "/placeholder.svg"}
            alt="Generated ad"
            width={300}
            height={300}
            className="w-full h-72 object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
            <Button
              size="sm"
              onClick={() => handleDownload(generation.image_url, generation.enhanced_prompt)}
              className="w-full"
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDelete(generation.id)}
              disabled={loadingId === generation.id}
              className="w-full"
            >
              {loadingId === generation.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white text-xs">
            <p className="line-clamp-2 mb-1">{generation.enhanced_prompt}</p>
            <p className="text-muted-foreground text-xs">{new Date(generation.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
