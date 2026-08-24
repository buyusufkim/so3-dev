export interface TrainingProgramListItem {
  id: number;
  uuid: string;
  title: string;
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  trainer: {
    id: number;
    name: string;
  };
}

export interface TrainingProgramsResponse {
  items: TrainingProgramListItem[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    last_page: number;
  };
}

export interface TrainingProgramDetail {
  id: number;
  uuid: string;
  title: string;
  status: "draft" | "active" | "archived";
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member: {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
  };
  trainer: {
    id: number;
    name: string;
  };
}

export interface TrainingProgramCreateResponse {
  id: number;
  uuid: string;
}

export interface SuccessResponse {
  success: boolean;
}
