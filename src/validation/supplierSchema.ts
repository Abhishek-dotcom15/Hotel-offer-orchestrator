import { z } from 'zod';

export const supplierHotelSchema = z.object({
  hotelId: z.string(),
  name: z.string().min(1),
  price: z.number().positive(),
  city: z.string().min(1),
  commissionPct: z.number().min(0).max(100),
});

export const supplierQuerySchema = z.object({
  city: z.string().min(1, 'city query parameter is required'),
});

// Schema for POST body (hotelId is auto-generated)
export const createHotelSchema = z.object({
  name: z.string().min(1, 'name is required'),
  price: z.number().positive('price must be positive'),
  city: z.string().min(1, 'city is required'),
  commissionPct: z.number().min(0).max(100, 'commissionPct must be between 0 and 100'),
});

export type SupplierHotelInput = z.infer<typeof supplierHotelSchema>;
export type CreateHotelInput = z.infer<typeof createHotelSchema>;
