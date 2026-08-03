import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useCart } from '../../context/CartProvider'
import { demoProducts } from '../../data/integrationsData'

/** Référence: WooCommerce archive + cart-dropdown patterns */
export function ShopPage() {
  const { addItem } = useCart()

  return (
    <div className="w-full">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-bb-xl font-semibold text-bb-heading">Shop</h1>
          <p className="m-0 mt-1 text-bb-sm text-bb-text">Merch and tickets for the community.</p>
        </div>
        <Button as={Link} to="/shop/cart" variant="outline" size="sm">
          View Cart
        </Button>
      </header>

      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {demoProducts.map((product) => (
          <li key={product.id} className="bb-card overflow-hidden">
            <Link to={`/shop/${product.id}`} className="block">
              <img src={product.image} alt={product.name} className="h-40 w-full object-cover" />
            </Link>
            <div className="p-4">
              <div className="text-bb-xs uppercase tracking-wide text-bb-muted">{product.category}</div>
              <Link
                to={`/shop/${product.id}`}
                className="mt-1 block font-semibold text-bb-heading hover:text-bb-primary"
              >
                {product.name}
              </Link>
              <p className="m-0 mt-1 line-clamp-2 text-bb-sm text-bb-text">{product.shortDescription}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <strong className="text-bb-heading">€{product.price}</strong>
                <Button
                  type="button"
                  size="sm"
                  disabled={!product.inStock}
                  onClick={() => addItem(product)}
                >
                  {product.inStock ? 'Add to cart' : 'Sold out'}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
