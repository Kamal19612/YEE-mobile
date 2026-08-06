import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { courses } from '../../data/integrationsData'

/** Référence: learndash/ld30/course.php + modules/progress */
export function CoursePage() {
  const { courseId } = useParams()
  const initial = courses.find((c) => String(c.id) === String(courseId))
  const [course, setCourse] = useState(initial)

  if (!course) {
    return (
      <div className="bb-card p-8 text-center">
        <h1 className="m-0 mb-2 text-bb-lg text-bb-heading">Course not found</h1>
        <Link to="/courses" className="text-bb-primary hover:underline">
          Back to courses
        </Link>
      </div>
    )
  }

  const completed = course.lessons.filter((l) => l.completed).length
  const progress = Math.round((completed / course.lessons.length) * 100)

  return (
    <div className="w-full max-w-content space-y-4">
      <div className="overflow-hidden rounded-bb border border-bb-border bg-bb-content">
        <img src={course.image} alt="" className="h-48 w-full object-cover" />
        <div className="p-5">
          <nav className="mb-2 text-bb-sm text-bb-muted">
            <Link to="/courses" className="hover:text-bb-primary">
              Courses
            </Link>
            <span className="mx-2">/</span>
            <span className="text-bb-heading">{course.title}</span>
          </nav>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">{course.title}</h1>
          <p className="m-0 mt-2 text-bb-sm text-bb-text">{course.excerpt}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!course.enrolled ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setCourse((c) => ({ ...c, enrolled: true, progress: 0 }))}
              >
                {course.price === 0 ? 'Enroll free' : `Enroll · €${course.price}`}
              </Button>
            ) : (
              <span className="rounded-bb-option bg-bb-label px-2 py-1 text-bb-xs font-semibold text-bb-label-text">
                Enrolled · {progress}% complete
              </span>
            )}
            <span className="text-bb-xs text-bb-muted">{course.students} students</span>
          </div>
          {course.enrolled && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bb-alt">
              <div className="h-full bg-bb-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>

      <section className="bb-card p-5">
        <h2 className="m-0 mb-3 text-bb-md font-semibold text-bb-heading">Curriculum</h2>
        <ul className="m-0 list-none space-y-2 p-0">
          {course.lessons.map((lesson, index) => (
            <li
              key={lesson.id}
              className="flex items-center justify-between gap-3 rounded-bb-inner border border-bb-border px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="text-bb-sm font-medium text-bb-heading">
                  {index + 1}. {lesson.title}
                </div>
                <div className="text-bb-xs text-bb-muted">{lesson.duration}</div>
              </div>
              {course.enrolled ? (
                <button
                  type="button"
                  className={`text-bb-xs font-medium ${
                    lesson.completed ? 'text-bb-success' : 'text-bb-primary hover:underline'
                  }`}
                  onClick={() =>
                    setCourse((c) => ({
                      ...c,
                      lessons: c.lessons.map((l) =>
                        l.id === lesson.id ? { ...l, completed: !l.completed } : l,
                      ),
                    }))
                  }
                >
                  {lesson.completed ? 'Completed' : 'Mark complete'}
                </button>
              ) : (
                <span className="text-bb-xs text-bb-muted">Locked</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
