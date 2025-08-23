import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to MetricPal
        </h1>
        <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-8">
          AI-Native B2B Analytics Platform
        </p>
        
        <div className="flex justify-center space-x-4 mb-8">
          <Link
            href="/auth/signin"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium"
          >
            Sign Up
          </Link>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Authentication system is ready!
          </p>
        </div>
      </div>
    </main>
  )
}