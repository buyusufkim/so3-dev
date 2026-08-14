export interface TrainerProfileMedia {
  id: number;
  url: string;
  thumbnail_url: string | null;
  alt_text: string | null;
}

export interface TrainerBranch {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
}

export interface AdminTrainerListItem {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  role_title: string;
  branch: TrainerBranch;
  is_active: boolean;
  sort_order: number;
  updated_at: string | null;
  profile: TrainerProfileMedia | null;
}

export interface AdminTrainerDetail {
  id: number;
  uuid: string;
  slug: string;
  name: string;
  role_title: string;
  bio: string | null;
  instagram_username: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  branch: TrainerBranch;
  profile: TrainerProfileMedia | null;
}

export interface AdminUser {
  id: number;
  username: string;
  email?: string;
  display_name?: string;
  role: 'super_admin' | 'admin' | 'editor';
}
