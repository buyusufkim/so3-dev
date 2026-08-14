export interface ContactSettings {
  phone_primary: string;
  phone_secondary: string | null;
  whatsapp: string;
}

export interface LocationSettings {
  address: string;
  maps_directions_url: string;
  maps_embed_url: string;
}

export interface SocialSettings {
  instagram_username: string;
}

export interface TourSettings {
  matterport_model_id: string;
}

export type BusinessDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface BusinessHoursItem {
  day: BusinessDay;
  is_closed: boolean;
  open: string | null;
  close: string | null;
}

export interface BusinessHoursSettings {
  enabled: boolean;
  items: BusinessHoursItem[];
}

export interface SiteSettingsResponse {
  contact: ContactSettings;
  location: LocationSettings;
  social: SocialSettings;
  tour: TourSettings;
  business_hours: BusinessHoursSettings;
}
