import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-400">
            Sign in to your StreamVault account
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <SignIn 
            path="/sign-in"
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
                identityPreviewEditButton: 'text-blue-400'
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}