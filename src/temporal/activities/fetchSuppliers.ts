import { config } from '../../config';
import { logger } from '../../utils/logger';
import { SupplierHotel } from '../../domain/types';
import { supplierHotelSchema } from '../../validation/supplierSchema';
import { z } from 'zod';

const supplierResponseSchema = z.array(supplierHotelSchema);

async function fetchSupplier(
  supplier: 'A' | 'B',
  city: string
): Promise<SupplierHotel[]> {
  const endpoint = supplier === 'A' ? 'supplierA' : 'supplierB';
  const url = `${config.suppliers.baseUrl}/${endpoint}/hotels?city=${encodeURIComponent(city)}`;

  logger.info('Fetching supplier', { supplier, city, url });

  const response = await fetch(url);

  if (!response.ok) {
    logger.error('Supplier fetch failed', {
      supplier,
      city,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Supplier ${supplier} returned ${response.status}`);
  }

  const data = await response.json();

  // Validate response with Zod
  const result = supplierResponseSchema.safeParse(data);
  if (!result.success) {
    logger.error('Supplier response validation failed', {
      supplier,
      city,
      error: result.error.issues[0].message,
    });
    throw new Error(`Invalid response from Supplier ${supplier}`);
  }

  logger.info('Supplier fetch complete', {
    supplier,
    city,
    count: result.data.length,
  });

  return result.data;
}

/**
 * Activity: Fetch hotels from Supplier A
 */
export async function fetchSupplierA(city: string): Promise<SupplierHotel[]> {
  return fetchSupplier('A', city);
}

/**
 * Activity: Fetch hotels from Supplier B
 */
export async function fetchSupplierB(city: string): Promise<SupplierHotel[]> {
  return fetchSupplier('B', city);
}
