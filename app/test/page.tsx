// Simple test page to verify app loads without errors
export default function TestPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-4xl font-bold mb-4">Test Page</h1>
      <p className="text-lg text-gray-600 mb-8">If you can see this, the Next.js app is loading correctly!</p>
      <div className="space-y-4">
        <a href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
          Home
        </a>
        <a href="/studio" className="inline-block ml-4 px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700">
          Studio
        </a>
      </div>
    </div>
  )
}
