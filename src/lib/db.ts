// DTO types returned by the API routes.
// Kept snake_case to mirror the database columns and minimize client churn.

export type GoalType = "deficit" | "maintenance" | "bulk";

export interface WeightEntry {
  id: number;
  date: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface CalorieEntry {
  id: number;
  date: string;
  calories_consumed: number;
  calories_burned: number;
  goal: GoalType;
  created_at: string;
  updated_at: string;
}

export interface GoalRow {
  id: number;
  target_weight: number;
  mode: "cut" | "bulk";
  initial_intensity: number;
  start_date: string;
  start_weight: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
