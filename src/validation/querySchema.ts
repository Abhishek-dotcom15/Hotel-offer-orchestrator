import { z } from 'zod';

export const hotelQuerySchema = z.object({
  city: z.string().min(1, 'city is required'),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
}).refine(
  (data) => {
    if (data.minPrice && data.maxPrice) {
      return data.minPrice <= data.maxPrice;
    }
    return true;
  },
  { message: 'minPrice must be less than or equal to maxPrice' }
);

export type HotelQueryInput = z.infer<typeof hotelQuerySchema>;
