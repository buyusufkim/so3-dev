export interface ContactSettings {
  phone_primary: string | null;
  phone_secondary: string | null;
  whatsapp: string | null;
  email: string | null;
}

export interface LocationSettings {
  address: string | null;
  maps_embed_url: string | null;
  maps_directions_url: string | null;
}

export interface SocialSettings {
  instagram_username: string | null;
}

export interface TourSettings {
  matterport_model_id: string | null;
}

export interface BusinessHoursItem {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

export interface BusinessHoursSettings {
  enabled: boolean;
  schedule: BusinessHoursItem[];
}

export interface SiteSettingsResponse {
  contact: ContactSettings;
  location: LocationSettings;
  social: SocialSettings;
  tour: TourSettings;
  business_hours: BusinessHoursSettings;
}
