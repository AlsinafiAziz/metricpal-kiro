import SignInForm from '@/components/auth/SignInForm'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            MetricPal
          </h1>
          <p className="text-center text-gray-600">
            AI-Native B2B Analytics Platform
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}