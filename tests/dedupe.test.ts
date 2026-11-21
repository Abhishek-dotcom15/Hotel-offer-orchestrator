import { describe, it, expect } from 'vitest';
import { selectBestOffers } from '../src/domain/dedupe';
import { SupplierHotel } from '../src/domain/types';

describe('selectBestOffers', () => {
  it('should replace A with B when B has strictly lower price (Holtin: 6000 → 5340)', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(5340);
    expect(result[0].supplier).toBe('B');
    expect(result[0].hotelId).toBe('b1');
  });

  it('should keep A when A has lower price (Radison: 5900 stays)', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b2', name: 'Radison', price: 6200, city: 'delhi', commissionPct: 15 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(5900);
    expect(result[0].supplier).toBe('A');
    expect(result[0].hotelId).toBe('a2');
  });

  it('should include single-supplier hotels (City Inn from A, Grand Stay from B)', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a3', name: 'City Inn', price: 3500, city: 'delhi', commissionPct: 12 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b3', name: 'Grand Stay', price: 7200, city: 'delhi', commissionPct: 15 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    expect(result).toHaveLength(2);
    expect(result.find(h => h.name === 'City Inn')?.supplier).toBe('A');
    expect(result.find(h => h.name === 'Grand Stay')?.supplier).toBe('B');
  });

  it('should prefer higher commission when prices are equal (Equal Stay: B has 18% vs A has 9%)', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a4', name: 'Equal Stay', price: 4500, city: 'delhi', commissionPct: 9 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b4', name: 'Equal Stay', price: 4500, city: 'delhi', commissionPct: 18 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(4500);
    expect(result[0].supplier).toBe('B'); // B wins - higher commission
    expect(result[0].commissionPct).toBe(18); // B's commission (more revenue!)
  });

  it('should keep A when prices are equal but A has higher commission', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Test Hotel', price: 5000, city: 'delhi', commissionPct: 20 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Test Hotel', price: 5000, city: 'delhi', commissionPct: 10 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    expect(result).toHaveLength(1);
    expect(result[0].supplier).toBe('A'); // A wins - higher commission
    expect(result[0].commissionPct).toBe(20);
  });

  it('should keep A when prices and commissions are both equal', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Test Hotel', price: 5000, city: 'delhi', commissionPct: 15 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Test Hotel', price: 5000, city: 'delhi', commissionPct: 15 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    expect(result).toHaveLength(1);
    expect(result[0].supplier).toBe('A'); // A wins - first processed
  });

  it('should handle case and whitespace normalization', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a1', name: '  HOLTIN  ', price: 6000, city: 'delhi', commissionPct: 10 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'holtin', price: 5340, city: 'delhi', commissionPct: 20 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(5340);
    expect(result[0].supplier).toBe('B');
  });

  it('should preserve commission from winning record', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Test Hotel', price: 5000, city: 'delhi', commissionPct: 10 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Test Hotel', price: 4000, city: 'delhi', commissionPct: 25 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    expect(result).toHaveLength(1);
    expect(result[0].commissionPct).toBe(25); // B wins, B's commission
    expect(result[0].supplier).toBe('B');
  });

  it('should return empty array when both lists are empty', () => {
    const result = selectBestOffers([], []);
    expect(result).toEqual([]);
  });

  it('should return sorted by price ascending', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Expensive', price: 9000, city: 'delhi', commissionPct: 10 },
      { hotelId: 'a2', name: 'Cheap', price: 2000, city: 'delhi', commissionPct: 10 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Medium', price: 5000, city: 'delhi', commissionPct: 15 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Cheap');
    expect(result[0].price).toBe(2000);
    expect(result[1].name).toBe('Medium');
    expect(result[1].price).toBe(5000);
    expect(result[2].name).toBe('Expensive');
    expect(result[2].price).toBe(9000);
  });

  it('should handle full fixture data correctly (delhi)', () => {
    const hotelsA: SupplierHotel[] = [
      { hotelId: 'a1', name: 'Holtin', price: 6000, city: 'delhi', commissionPct: 10 },
      { hotelId: 'a2', name: 'Radison', price: 5900, city: 'delhi', commissionPct: 13 },
      { hotelId: 'a3', name: 'City Inn', price: 3500, city: 'delhi', commissionPct: 12 },
      { hotelId: 'a4', name: 'Equal Stay', price: 4500, city: 'delhi', commissionPct: 9 },
    ];
    const hotelsB: SupplierHotel[] = [
      { hotelId: 'b1', name: 'Holtin', price: 5340, city: 'delhi', commissionPct: 20 },
      { hotelId: 'b2', name: 'Radison', price: 6200, city: 'delhi', commissionPct: 15 },
      { hotelId: 'b3', name: 'Grand Stay', price: 7200, city: 'delhi', commissionPct: 15 },
      { hotelId: 'b4', name: 'Equal Stay', price: 4500, city: 'delhi', commissionPct: 18 },
    ];

    const result = selectBestOffers(hotelsA, hotelsB);

    // Should have 5 unique hotels
    expect(result).toHaveLength(5);

    // Verify order (sorted by price)
    expect(result[0]).toMatchObject({ name: 'City Inn', price: 3500, supplier: 'A' });
    expect(result[1]).toMatchObject({ name: 'Equal Stay', price: 4500, supplier: 'B' }); // B wins: higher commission (18% vs 9%)
    expect(result[2]).toMatchObject({ name: 'Holtin', price: 5340, supplier: 'B' }); // B cheaper
    expect(result[3]).toMatchObject({ name: 'Radison', price: 5900, supplier: 'A' }); // A cheaper
    expect(result[4]).toMatchObject({ name: 'Grand Stay', price: 7200, supplier: 'B' }); // Only in B
  });
});
