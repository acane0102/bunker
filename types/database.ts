export type Profile = {
  id: string;
  email: string;
  role: string | null;
  plan: string | null;
  bunkers_allowed: number | null;
  status: string | null;
  created_at: string;
};

export type Trade = {
  id: string;
  user_id: string;
  asset: string;
  direction: string;
  setup_type: string;
  rr_achieved: number;
  status: string;
  risk_percent: number;
  investment: number;
  created_at: string;
};

export type Transaction = {
  id: number;
  user_id: string;
  broker: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
};