import { z } from 'zod';

export const ProductIn = z.object({
  sku: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().nonnegative(),
  category_id: z.union([z.string().uuid(), z.string().min(1)]).optional(),
  imageUrl: z.string().url().optional(),
  is_active: z.coerce.boolean().optional(),
});

export type ProductIn = z.infer<typeof ProductIn>;

