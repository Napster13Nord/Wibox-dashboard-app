import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Subtle animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Wibox
          </h1>
          <p className="text-sm text-blue-200/70">
            Recipe Automation Dashboard
          </p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-white/95 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl',
              headerTitle: 'text-gray-900 font-bold',
              headerSubtitle: 'text-gray-500',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all duration-200',
              formFieldInput: 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg',
              footerActionLink: 'text-blue-600 hover:text-blue-700 font-medium',
            },
          }}
        />
      </div>
    </div>
  );
}
