import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { demoCourses } from '../../data/integrationsData'

/** Référence: learndash ld30 course_list_grid_template */
export function CoursesPage() {
  return (
    <div className="w-full">
      <header className="mb-5">
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">Courses</h1>
        <p className="m-0 mt-1 text-bb-sm text-bb-text">LearnDash-style course directory.</p>
      </header>

      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {demoCourses.map((course) => (
          <li key={course.id} className="bb-card overflow-hidden">
            <Link to={`/courses/${course.id}`} className="relative block">
              <img src={course.image} alt="" className="h-40 w-full object-cover" />
              <span className="absolute left-3 top-3 rounded-bb-option bg-bb-primary px-2 py-0.5 text-bb-xs font-semibold text-white">
                {course.price === 0 ? 'Free' : `€${course.price}`}
              </span>
            </Link>
            <div className="p-4">
              <Link
                to={`/courses/${course.id}`}
                className="block text-bb-md font-semibold text-bb-heading hover:text-bb-primary"
              >
                {course.title}
              </Link>
              <p className="m-0 mt-2 line-clamp-2 text-bb-sm text-bb-text">{course.excerpt}</p>
              <div className="mt-3 flex items-center justify-between text-bb-xs text-bb-muted">
                <span>{course.students} students</span>
                {course.enrolled && <span>{course.progress}% complete</span>}
              </div>
              {course.enrolled && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bb-alt">
                  <div className="h-full bg-bb-primary" style={{ width: `${course.progress}%` }} />
                </div>
              )}
              <Button as={Link} to={`/courses/${course.id}`} size="sm" className="mt-4 w-full">
                {course.enrolled ? 'Continue' : 'See more...'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
