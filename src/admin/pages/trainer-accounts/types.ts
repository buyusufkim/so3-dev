export interface TrainerAccountTrainer {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface TrainerAccountDetails {
  id: number;
  username: string;
  email: string;
  display_name: string;
  role: 'trainer';
  status: 'active' | 'inactive';
  last_login_at: string | null;
  password_changed_at: string | null;
}

export interface TrainerAccountRow {
  trainer: TrainerAccountTrainer;
  account: TrainerAccountDetails | null;
}
