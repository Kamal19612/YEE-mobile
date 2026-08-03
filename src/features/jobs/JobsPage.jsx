import { Link } from 'react-router-dom'
import { demoJobs } from '../../data/integrationsData'
import { formatTimeSince } from '../activity/utils'

/** Référence: template-parts/content-job.php */
export function JobsPage() {
  return (
    <div className="w-full max-w-content">
      <header className="mb-5">
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">Jobs</h1>
        <p className="m-0 mt-1 text-bb-sm text-bb-text">Open roles from the community.</p>
      </header>

      <ul className="m-0 list-none space-y-3 p-0">
        {demoJobs.map((job) => (
          <li key={job.id} className="bb-card p-4">
            <article>
              <h2 className="entry-title m-0 text-bb-md font-semibold">
                <Link to={`/jobs/${job.id}`} className="text-bb-heading hover:text-bb-primary">
                  {job.title}
                </Link>
              </h2>
              <ul className="job-listing-meta m-0 mt-2 flex list-none flex-wrap gap-3 p-0 text-bb-sm text-bb-muted">
                <li className="job-type rounded-bb-option bg-bb-label px-2 py-0.5 text-bb-xs font-medium text-bb-label-text">
                  {job.type}
                </li>
                <li className="location">{job.location}</li>
                <li className="salary">{job.salary}</li>
                <li className="date-posted">Posted {formatTimeSince(job.postedAt)}</li>
              </ul>
              <p className="m-0 mt-2 text-bb-sm text-bb-text">
                <strong className="text-bb-heading">{job.company}</strong> — {job.description}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}
