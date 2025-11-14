"use client"

interface StylePresetsProps {
  selectedPreset?: string
  onSelectPreset: (preset: string) => void
}

const STYLE_PRESETS = [
  {
    id: "photorealistic",
    label: "Photorealistic",
    description: "Professional photography style",
    icon: "📷",
  },
  {
    id: "oil-painting",
    label: "Oil Painting",
    description: "Artistic oil painting effect",
    icon: "🎨",
  },
  {
    id: "social-ad",
    label: "Social Ad",
    description: "Optimized for social media",
    icon: "📱",
  },
  {
    id: "catalog",
    label: "Catalog",
    description: "Product catalog style",
    icon: "📚",
  },
]

export function StylePresets({ selectedPreset, onSelectPreset }: StylePresetsProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-gray-900">Style Preset</label>
      <div className="grid grid-cols-2 gap-2">
        {STYLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset.id)}
            className={`relative overflow-hidden rounded-xl p-3 transition-all duration-200 transform hover:scale-105 ${
              selectedPreset === preset.id
                ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg ring-2 ring-rose-300"
                : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 border border-gray-200 hover:border-rose-300 hover:bg-rose-50"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl">{preset.icon}</span>
              <span className="text-xs font-semibold">{preset.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
