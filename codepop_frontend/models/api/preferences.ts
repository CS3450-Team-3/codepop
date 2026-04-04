import api from "./api";
import { Preference, CreatePreferencePayload } from "@/models/types/preference";

export async function getPreferences(): Promise<Preference[]> {
  const { data } = await api.get("preferences/");
  return data;
}

export async function createPreference(payload: CreatePreferencePayload): Promise<Preference> {
  const { data } = await api.post("preferences/", payload);
  return data;
}

export async function getPreference(preferenceId: number): Promise<Preference> {
  const { data } = await api.get(`preferences/${preferenceId}/`);
  return data;
}

export async function updatePreference(
  preferenceId: number,
  payload: CreatePreferencePayload
): Promise<Preference> {
  const { data } = await api.put(`preferences/${preferenceId}/`, payload);
  return data;
}

export async function deletePreference(preferenceId: number): Promise<void> {
  await api.delete(`preferences/${preferenceId}/`);
}

export async function getUserPreferences(userId: string): Promise<Preference[]> {
  const { data } = await api.get(`users/${userId}/preferences/`);
  return data;
}
