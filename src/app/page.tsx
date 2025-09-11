import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            My Senior Year
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Navigate your path to graduation with confidence. Track academics, 
            manage college applications, find scholarships, and log community service 
            all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/signup"
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="border border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-indigo-600 text-3xl mb-4">🎓</div>
              <h3 className="text-lg font-semibold mb-2">Academic Progress</h3>
              <p className="text-gray-600">Track courses, grades, and graduation requirements</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-indigo-600 text-3xl mb-4">🏫</div>
              <h3 className="text-lg font-semibold mb-2">College Readiness</h3>
              <p className="text-gray-600">Manage applications, essays, and recommendations</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-indigo-600 text-3xl mb-4">💰</div>
              <h3 className="text-lg font-semibold mb-2">Scholarships</h3>
              <p className="text-gray-600">Discover and track scholarship opportunities</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-indigo-600 text-3xl mb-4">🤝</div>
              <h3 className="text-lg font-semibold mb-2">Service Hours</h3>
              <p className="text-gray-600">Log community service and extracurriculars</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
