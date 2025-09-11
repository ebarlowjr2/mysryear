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

          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Why My Senior Year?
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                A comprehensive platform designed specifically for high school students navigating their path to graduation
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
              <div className="card p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Stay On Track</h3>
                <p className="text-gray-400 mb-4">
                  Never miss important deadlines with smart notifications and personalized reminders for college applications, scholarships, and graduation requirements.
                </p>
                <Link href="/dashboard/notifications" className="text-purple-400 hover:text-purple-300 font-medium">
                  Learn More →
                </Link>
              </div>
              
              <div className="card p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Track Your Progress</h3>
                <p className="text-gray-400 mb-4">
                  Visualize your academic journey with comprehensive tracking of grades, credits, GPA, and graduation requirements all in one place.
                </p>
                <Link href="/dashboard/academics" className="text-purple-400 hover:text-purple-300 font-medium">
                  Learn More →
                </Link>
              </div>
              
              <div className="card p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🚀</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">Unlock Opportunities</h3>
                <p className="text-gray-400 mb-4">
                  Discover scholarships, college programs, and career paths tailored to your interests and achievements with our smart matching system.
                </p>
                <Link href="/dashboard/scholarships" className="text-purple-400 hover:text-purple-300 font-medium">
                  Learn More →
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Proven Results
              </h2>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                Students using My Senior Year see measurable improvements in their graduation readiness
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
              <div className="card p-6 text-center">
                <div className="text-4xl font-bold gradient-text mb-2">94%</div>
                <div className="text-white font-semibold mb-2">On-Time Graduation</div>
                <div className="text-gray-400 text-sm">Students complete requirements on schedule</div>
              </div>
              
              <div className="card p-6 text-center">
                <div className="text-4xl font-bold gradient-text mb-2">87%</div>
                <div className="text-white font-semibold mb-2">College Acceptance</div>
                <div className="text-gray-400 text-sm">Students accepted to their top choice schools</div>
              </div>
              
              <div className="card p-6 text-center">
                <div className="text-4xl font-bold gradient-text mb-2">$12K</div>
                <div className="text-white font-semibold mb-2">Average Scholarships</div>
                <div className="text-gray-400 text-sm">In scholarship awards secured per student</div>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <div className="card p-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-6xl mb-6">💬</div>
                <blockquote className="text-xl text-white/90 mb-6 italic">
                  &ldquo;My Senior Year helped me stay organized and on track throughout my entire senior year. I discovered scholarships I never would have found on my own and graduated with confidence knowing I had completed everything I needed for college.&rdquo;
                </blockquote>
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">JS</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Jessica Smith</div>
                    <div className="text-gray-400 text-sm">Class of 2024, Now at UC Berkeley</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Everything You Need in One Place
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Comprehensive tools to manage every aspect of your senior year journey
            </p>
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
