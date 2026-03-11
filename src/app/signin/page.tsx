'use client'

import Link from 'next/link'
import { FileText, ArrowRight } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">DocQuiz</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h1>
          <p className="text-slate-600">Sign in to access your documents</p>
        </div>

        <div className="bg-white rounded-2xl border p-6">
          <p className="text-slate-600 mb-6 text-center">
            DocQuiz Free is currently in demo mode. No sign-in required!
          </p>
          
          <Link
            href="/dashboard"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Enter Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}
