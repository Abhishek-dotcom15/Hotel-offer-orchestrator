import crypto from 'crypto';
import { SupplierHotel } from '../domain/types';

function generateId(): string {
  return `b-${crypto.randomUUID()}`;
}

// Mutable array - can be modified via POST API
export const supplierBHotels: SupplierHotel[] = [
  {
    hotelId: generateId(),
    name: 'Holtin',
    price: 5340,
    city: 'delhi',
    commissionPct: 20,
  },
  {
    hotelId: generateId(),
    name: 'Radison',
    price: 6200,
    city: 'delhi',
    commissionPct: 15,
  },
  {
    hotelId: generateId(),
    name: 'Grand Stay',
    price: 7200,
    city: 'delhi',
    commissionPct: 15,
  },
  {
    hotelId: generateId(),
    name: 'Equal Stay',
    price: 4500,
    city: 'delhi',
    commissionPct: 18,
  },
  {
    hotelId: generateId(),
    name: 'Sea View',
    price: 7600,
    city: 'mumbai',
    commissionPct: 12,
  },
];

export function addHotelToSupplierB(hotel: Omit<SupplierHotel, 'hotelId'>): SupplierHotel {
  const newHotel: SupplierHotel = {
    ...hotel,
    hotelId: generateId(),
  };
  supplierBHotels.push(newHotel);
  return newHotel;
}
