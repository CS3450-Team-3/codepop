export interface Preference {
  PreferenceID: number;
  UserID: string;
  Preference: string;
}

export interface CreatePreferencePayload {
  UserID: string;
  Preference: string;
}
