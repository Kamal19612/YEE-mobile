import { Link } from 'react-router-dom'
import { IconAngleRight, IconCart } from '../components/icons'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Dropdown, DropdownFooter, DropdownHeader } from '../components/ui/Dropdown'
import { useCart } from '../context/CartProvider'
import { useLayout } from '../context/LayoutProvider'

/** Référence: template-parts/cart-dropdown.php */
export function CartDropdown() {
  const { items, count, total, removeItem } = useCart()
  const { closeDropdowns } = useLayout()

  return (
    <Dropdown
      id="cart"
      width="w-[340px]"
      trigger={
        <span data-balloon-pos="down" data-balloon="Cart" className="relative inline-flex">
          <IconCart />
          <Badge count={count} />
          <span className="screen-reader-text">Cart</span>
        </span>
      }
    >
      <DropdownHeader
        title="Shopping Cart"
        action={
          count > 0 ? (
            <Link
              to="/shop/cart"
              onClick={closeDropdowns}
              className="header-view-cart-link text-bb-sm text-bb-primary hover:underline"
            >
              View Cart
            </Link>
          ) : null
        }
      />
      <div className="header-mini-cart max-h-[320px] overflow-y-auto">
        {!items.length ? (
          <div className="px-4 py-6 text-center text-bb-sm text-bb-muted">No products in the cart.</div>
        ) : (
          <ul className="m-0 list-none divide-y divide-bb-border p-0">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <img src={item.image} alt="" className="h-12 w-12 rounded-bb-inner object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-bb-sm font-medium text-bb-heading">{item.name}</div>
                  <div className="text-bb-xs text-bb-muted">
                    {item.quantity} × €{item.price}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-bb-xs text-bb-danger"
                  onClick={() => removeItem(item.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {count > 0 && (
        <div className="flex items-center justify-between border-t border-bb-border px-4 py-3">
          <span className="text-bb-sm font-semibold text-bb-heading">Subtotal: €{total}</span>
          <Button as={Link} to="/shop/checkout" size="sm" onClick={closeDropdowns}>
            Checkout
          </Button>
        </div>
      )}
      <DropdownFooter href="/shop" onClick={closeDropdowns}>
        Browse Shop
        <IconAngleRight />
      </DropdownFooter>
    </Dropdown>
  )
}
