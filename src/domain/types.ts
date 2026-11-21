export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

export interface HotelOffer {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
  supplier: 'A' | 'B';
}

export interface HotelQueryParams {
  city: string;
  minPrice?: number;
  maxPrice?: number;
}

export type SupplierStatus = 'success' | 'failed' | 'skipped';
export type DataFreshness = 'live' | 'partial' | 'cached' | 'stale';

export interface ResponseMeta {
  sources: {
    supplierA: SupplierStatus;
    supplierB: SupplierStatus;
  };
  fromCache: boolean;
  cacheAge?: number;
  warning?: string;
  dataFreshness: DataFreshness;
}

export interface HotelResponse {
  hotels: HotelOffer[];
  meta: ResponseMeta;
}
