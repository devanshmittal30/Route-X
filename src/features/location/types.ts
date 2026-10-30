export interface SelectedLocation {
  name: string;
  admin1?: string; // State / Region (e.g. Himachal Pradesh)
  country?: string; // India
  latitude: number;
  longitude: number;
  isDeviceLocation?: boolean;
}

export interface GeocodingResultItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
}

