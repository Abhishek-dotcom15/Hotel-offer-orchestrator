import { describe, it, expect } from 'vitest';
import { normalizeHotelName } from '../src/domain/normalize';

describe('normalizeHotelName', () => {
  it('should trim whitespace', () => {
    expect(normalizeHotelName('  Holtin  ')).toBe('holtin');
  });

  it('should convert to lowercase', () => {
    expect(normalizeHotelName('HOLTIN')).toBe('holtin');
    expect(normalizeHotelName('HoLtIn')).toBe('holtin');
  });

  it('should handle mixed case with whitespace', () => {
    expect(normalizeHotelName('  GRAND Stay  ')).toBe('grand stay');
  });

  it('should handle already normalized names', () => {
    expect(normalizeHotelName('holtin')).toBe('holtin');
  });

  it('should handle names with multiple spaces', () => {
    expect(normalizeHotelName('City Inn')).toBe('city inn');
  });

  it('should handle empty string', () => {
    expect(normalizeHotelName('')).toBe('');
  });

  it('should handle string with only whitespace', () => {
    expect(normalizeHotelName('   ')).toBe('');
  });
});
