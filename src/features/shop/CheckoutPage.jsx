import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useCart } from '../../context/CartProvider'

/** Référence: woocommerce/checkout/form-checkout.php (shell) */
export function CheckoutPage() {
  const { items, total, clear } = useCart()
  const navigate = useNavigate()
  const [done, setDone] = useState(false)

  if (!items.length && !done) {
    return (
      <div className="bb-card p-8 text-center">
        <p className="m-0 mb-3 text-bb-sm text-bb-muted">Your cart is empty.</p>
        <Button as={Link} to="/shop" size="sm">
          Back to shop
        </Button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="bb-card max-w-content p-8 text-center">
        <h1 className="m-0 mb-2 text-bb-xl font-semibold text-bb-heading">Order received</h1>
        <p className="m-0 mb-4 text-bb-sm text-bb-text">
          Thank you! This is a demo checkout — no payment was processed.
        </p>
        <Button as={Link} to="/shop" size="sm">
          Continue shopping
        </Button>
      </div>
    )
  }

  return (
    <div className="grid w-full max-w-content gap-4 bb:grid-cols-[1.2fr_0.8fr]">
      <form
        className="bb-card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          clear()
          setDone(true)
          navigate('/shop/checkout', { replace: true })
        }}
      >
        <h1 className="m-0 text-bb-lg font-semibold text-bb-heading">Checkout</h1>
        <Field label="Full name" required />
        <Field label="Email" type="email" required />
        <Field label="Address" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="City" required />
          <Field label="Postal code" required />
        </div>
        <Button type="submit" size="sm">
          Place order (demo)
        </Button>
      </form>

      <aside className="bb-card h-fit p-5">
        <h2 className="m-0 mb-3 text-bb-md font-semibold text-bb-heading">Order review</h2>
        <ul className="m-0 mb-3 list-none space-y-2 p-0 text-bb-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2 text-bb-text">
              <span>
                {i.name} × {i.quantity}
              </span>
              <span className="text-bb-heading">€{i.price * i.quantity}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-bb-border pt-3 font-semibold text-bb-heading">
          Total: €{total}
        </div>
      </aside>
    </div>
  )
}

function Field({ label, type = 'text', required }) {
  return (
    <label className="block">
      <span className="mb-1 block text-bb-sm font-medium text-bb-heading">{label}</span>
      <input
        type={type}
        required={required}
        className="h-10 w-full rounded-bb-input border border-bb-border px-3 text-bb-sm outline-none focus:border-bb-primary"
      />
    </label>
  )
}
