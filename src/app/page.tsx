'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center animate-fade-in">
        <div className="text-7xl mb-6">🖥️</div>
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
          Desktop Quiz
        </h1>
        <p className="text-surface-200 text-lg mb-12 max-w-md mx-auto">
          Can you guess whose desktop belongs to whom? Create a quiz or join one!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/create"
            className="px-8 py-4 bg-primary-600 hover:bg-primary-500 rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-primary-600/25"
          >
            🎨 Create Quiz
          </Link>
          <Link
            href="/play"
            className="px-8 py-4 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl text-lg font-semibold transition-all hover:scale-105"
          >
            🎮 Join Quiz
          </Link>
        </div>
      </div>
      <p className="absolute bottom-6 text-surface-700 text-sm">
        Demo mode — data resets on redeploy
      </p>
    </div>
  )
}
