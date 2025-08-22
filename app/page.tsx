import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function HomePage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-4 py-16">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-white mb-6">
                        Welcome to{' '}
                        <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            StreamVault
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                        Professional live streaming platform with subscription-based monetization
                        and enterprise-grade features. Stream, engage, and monetize your content
                        with cutting-edge technology.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <SignedOut>
                            <SignInButton mode="modal">
                                <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                                    Get Started
                                </button>
                            </SignInButton>
                            <Link href="/sign-up">
                                <button className="px-8 py-3 border border-gray-300 hover:bg-gray-100 hover:text-gray-900 text-white font-semibold rounded-lg transition-colors">
                                    Sign Up
                                </button>
                            </Link>
                        </SignedOut>
                        <SignedIn>
                            <Link href="/dashboard">
                                <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                                    Go to Dashboard
                                </button>
                            </Link>
                            <UserButton 
                                appearance={{
                                    elements: {
                                        avatarBox: 'w-10 h-10'
                                    }
                                }}
                            />
                        </SignedIn>
                    </div>
                </div>

                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-red-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                            <span className="text-white font-bold">LIVE</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Live Streaming</h3>
                        <p className="text-gray-300">
                            Professional quality broadcasting with RTMP ingest and HLS delivery
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-purple-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                            <span className="text-white font-bold">VOD</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Video on Demand</h3>
                        <p className="text-gray-300">
                            Secure video-on-demand with signed URLs and content protection
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                            <span className="text-white font-bold">AI</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">AI Enhancement</h3>
                        <p className="text-gray-300">
                            Automated content processing, thumbnails, and recommendations
                        </p>
                    </div>
                </div>
            </div>
        </main>
    )
}