import PortfolioClient from './ui/PortfolioClient'

export default function PortfolioPage() {
  return (
    <div className="container-prose py-14">
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight">Student Portfolio</h1>
        <p className="text-slate-700 mt-2">
          Build the activities, service, awards, and certification record that will power scholarships, applications,
          resumes, and counselor support.
        </p>
      </div>
      <PortfolioClient />
    </div>
  )
}
