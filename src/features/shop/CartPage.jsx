import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useCart } from '../../context/CartProvider'

export function CartPage() {
  const { items, total, updateQty, removeItem, clear } = useCart()

  return (
    <div className="w-full max-w-content">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">Shopping Cart</h1>
        <Button as={Link} to="/shop" variant="outline" size="sm">
          Continue shopping
        </Button>
      </header>

      {!items.length ? (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">Your cart is empty.</div>
      ) : (
        <div className="space-y-4">
          <ul className="bb-card m-0 list-none divide-y divide-bb-border p-0">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-4 p-4">
                <img src={item.image} alt="" className="h-16 w-16 rounded-bb-inner object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to={`/shop/${item.id}`} className="font-medium text-bb-heading hover:text-bb-primary">
                    {item.name}
                  </Link>
                  <div className="text-bb-sm text-bb-muted">€{item.price}</div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateQty(item.id, Number(e.target.value))}
                  className="h-9 w-16 rounded-bb-input border border-bb-border px-2 text-bb-sm"
                />
                <strong className="w-16 text-right text-bb-heading">
                  €{item.price * item.quantity}
                </strong>
                <button
                  type="button"
                  className="text-bb-xs text-bb-danger hover:underline"
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <div className="bb-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-bb-md font-semibold text-bb-heading">Total: €{total}</div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clear}>
                Clear
              </Button>
              <Button as={Link} to="/shop/checkout" size="sm">
                Checkout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
