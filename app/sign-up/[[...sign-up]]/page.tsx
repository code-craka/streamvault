import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">
            Join StreamVault
          </h1>
          <p className="text-gray-400">
            Create your account and start streaming
          </p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 backdrop-blur-sm">
          <SignUp
            path="/sign-up"
            routing="path"
            appearance={{
              elements: {
                formButtonPrimary:
                  'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
                card: 'bg-transparent shadow-none',
                headerTitle: 'text-white',
                headerSubtitle: 'text-gray-400',
                socialButtonsBlockButton:
                  'bg-gray-700 border-gray-600 text-white hover:bg-gray-600',
                socialButtonsBlockButtonText: 'text-white',
                formFieldLabel: 'text-gray-300',
                formFieldInput:
                  'bg-gray-700 border-gray-600 text-white focus:border-blue-500',
                footerActionLink: 'text-blue-400 hover:text-blue-300',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-blue-400',
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
