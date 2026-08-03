import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { demoJobs } from '../../data/integrationsData'
import { formatTimeSince } from '../activity/utils'

export function JobPage() {
  const { jobId } = useParams()
  const job = demoJobs.find((j) => String(j.id) === String(jobId))

  if (!job) {
    return (
      <div className="bb-card p-8 text-center">
        <h1 className="m-0 mb-2 text-bb-lg text-bb-heading">Job not found</h1>
        <Link to="/jobs" className="text-bb-primary hover:underline">
          Back to jobs
        </Link>
      </div>
    )
  }

  return (
    <article className="bb-card w-full max-w-content p-5">
      <nav className="mb-2 text-bb-sm text-bb-muted">
        <Link to="/jobs" className="hover:text-bb-primary">
          Jobs
        </Link>
        <span className="mx-2">/</span>
        <span className="text-bb-heading">{job.title}</span>
      </nav>
      <h1 className="entry-title m-0 text-bb-xl font-semibold text-bb-heading">{job.title}</h1>
      <div className="mt-1 text-bb-sm text-bb-text">{job.company}</div>
      <ul className="job-listing-meta m-0 mt-3 flex list-none flex-wrap gap-3 p-0 text-bb-sm text-bb-muted">
        <li className="job-type rounded-bb-option bg-bb-label px-2 py-0.5 text-bb-xs font-medium text-bb-label-text">
          {job.type}
        </li>
        <li>{job.location}</li>
        <li>{job.salary}</li>
        <li>Posted {formatTimeSince(job.postedAt)}</li>
      </ul>
      <p className="mt-4 text-bb-base text-bb-text">{job.description}</p>
      <Button type="button" size="sm" className="mt-4">
        Apply (demo)
      </Button>
    </article>
  )
}
