import { createContext, useContext, useMemo, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  const addItem = (product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + qty } : i,
        )
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: qty,
        },
      ]
    })
  }

  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id))

  const updateQty = (id, quantity) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i))
        .filter((i) => i.quantity > 0),
    )
  }

  const clear = () => setItems([])

  const value = useMemo(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0)
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    return { items, count, total, addItem, removeItem, updateQty, clear }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
