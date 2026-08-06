import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useCart } from '../../context/CartProvider'
import { products } from '../../data/integrationsData'

export function ProductPage() {
  const { productId } = useParams()
  const { addItem } = useCart()
  const product = products.find((p) => String(p.id) === String(productId))

  if (!product) {
    return (
      <div className="bb-card p-8 text-center">
        <h1 className="m-0 mb-2 text-bb-lg text-bb-heading">Product not found</h1>
        <Link to="/shop" className="text-bb-primary hover:underline">
          Back to shop
        </Link>
      </div>
    )
  }

  return (
    <div className="grid w-full gap-6 bb:grid-cols-2">
      <img
        src={product.image}
        alt={product.name}
        className="h-72 w-full rounded-bb object-cover bb:h-full"
      />
      <div>
        <nav className="mb-3 text-bb-sm text-bb-muted">
          <Link to="/shop" className="hover:text-bb-primary">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span className="text-bb-heading">{product.name}</span>
        </nav>
        <div className="text-bb-xs uppercase text-bb-muted">{product.category}</div>
        <h1 className="m-0 mt-1 text-bb-xl font-semibold text-bb-heading">{product.name}</h1>
        <div className="mt-2 text-bb-lg font-semibold text-bb-primary">€{product.price}</div>
        <p className="mt-4 text-bb-base text-bb-text">{product.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" disabled={!product.inStock} onClick={() => addItem(product)}>
            {product.inStock ? 'Add to cart' : 'Sold out'}
          </Button>
          <Button as={Link} to="/shop/cart" variant="outline">
            View Cart
          </Button>
        </div>
      </div>
    </div>
  )
}
