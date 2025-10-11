"use client"
import { useEffect } from 'react'

export default function ProductImpression({
  productId,
  dataset,
}: {
  productId: string
  dataset: "shop" | "legacy"
}) {
  useEffect(() => {
    if (!productId) return
    fetch('/api/track/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, dataset }),
    }).catch(() => {})
  }, [productId, dataset])
  return null
}


