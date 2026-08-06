import { useState } from 'react'
import clsx from 'clsx'
import { Button } from '../../components/ui/Button'
import { memberships } from '../../data/integrationsData'

/** Référence patterns MemberPress / PMPro pricing tables */
export function MembershipsPage() {
  const [active, setActive] = useState(1)

  return (
    <div className="w-full">
      <header className="mb-6 text-center">
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">Memberships</h1>
        <p className="m-0 mt-1 text-bb-sm text-bb-text">
          Unlock courses, early event access, and team workspaces.
        </p>
      </header>

      <ul className="m-0 mx-auto grid max-w-4xl list-none grid-cols-1 gap-4 p-0 bb:grid-cols-3">
        {memberships.map((plan) => (
          <li
            key={plan.id}
            className={clsx(
              'bb-card flex flex-col p-5',
              plan.highlight && 'border-bb-primary ring-1 ring-bb-primary',
            )}
          >
            {plan.highlight && (
              <span className="mb-2 self-start rounded-bb-option bg-bb-primary px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                Popular
              </span>
            )}
            <h2 className="m-0 text-bb-lg font-semibold text-bb-heading">{plan.name}</h2>
            <div className="mt-2 text-bb-heading">
              <span className="text-bb-xl font-semibold">
                {plan.price === 0 ? 'Free' : `€${plan.price}`}
              </span>
              {plan.price > 0 && (
                <span className="text-bb-sm text-bb-muted">/{plan.period}</span>
              )}
            </div>
            <ul className="m-0 mt-4 list-none space-y-2 p-0 text-bb-sm text-bb-text">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-bb-success">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              size="sm"
              variant={active === plan.id ? 'secondary' : plan.highlight ? 'primary' : 'outline'}
              className="mt-auto pt-5"
              onClick={() => setActive(plan.id)}
            >
              {active === plan.id ? 'Current plan' : 'Choose plan'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
