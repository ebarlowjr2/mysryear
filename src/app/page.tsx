import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/50 to-slate-900"></div>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">My Senior Year</span>
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-white/90 mb-8">
            The Graduation Tool<br />
            <span className="text-white/70">for the Modern Student</span>
          </h2>
          <p className="text-lg text-white/80 mb-12 max-w-2xl mx-auto">
            Navigate your path to graduation with confidence. Track academics, 
            manage college applications, find scholarships, and log community service 
            all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <Link href="/signup" className="btn-gradient px-8 py-4 rounded-lg font-semibold text-lg min-w-[160px]">
              Get Started
            </Link>
            <Link href="/login" className="glass px-8 py-4 rounded-lg font-semibold text-lg text-white hover:bg-white/10 transition-all duration-300 min-w-[160px]">
              Sign In
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="card p-6 animate-fade-in">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Academic Progress</h3>
              <p className="text-gray-400">Track courses, grades, and graduation requirements</p>
            </div>
            
            <div className="card p-6 animate-fade-in" style={{animationDelay: '0.1s'}}>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🏫</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">College Readiness</h3>
              <p className="text-gray-400">Manage applications, essays, and recommendations</p>
            </div>
            
            <div className="card p-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Scholarships</h3>
              <p className="text-gray-400">Discover and track scholarship opportunities</p>
            </div>
            
            <div className="card p-6 animate-fade-in" style={{animationDelay: '0.3s'}}>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Service Hours</h3>
              <p className="text-gray-400">Log community service and extracurriculars</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
