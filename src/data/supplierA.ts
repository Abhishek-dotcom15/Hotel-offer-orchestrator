import crypto from 'crypto';
import { SupplierHotel } from '../domain/types';

function generateId(): string {
  return `a-${crypto.randomUUID()}`;
}

// Mutable array - can be modified via POST API
export const supplierAHotels: SupplierHotel[] = [
  {
    hotelId: generateId(),
    name: 'Holtin',
    price: 6000,
    city: 'delhi',
    commissionPct: 10,
  },
  {
    hotelId: generateId(),
    name: 'Radison',
    price: 5900,
    city: 'delhi',
    commissionPct: 13,
  },
  {
    hotelId: generateId(),
    name: 'City Inn',
    price: 3500,
    city: 'delhi',
    commissionPct: 12,
  },
  {
    hotelId: generateId(),
    name: 'Equal Stay',
    price: 4500,
    city: 'delhi',
    commissionPct: 9,
  },
  {
    hotelId: generateId(),
    name: 'Sea View',
    price: 8000,
    city: 'mumbai',
    commissionPct: 10,
  },
];

export function addHotelToSupplierA(hotel: Omit<SupplierHotel, 'hotelId'>): SupplierHotel {
  const newHotel: SupplierHotel = {
    ...hotel,
    hotelId: generateId(),
  };
  supplierAHotels.push(newHotel);
  return newHotel;
}
