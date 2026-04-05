import api from "./api";
import { Revenue, CreateRevenuePayload } from "@/models/types/revenue";

export async function getRevenues(): Promise<Revenue[]> {
  const { data } = await api.get("revenues/");
  return data;
}

export async function createRevenue(payload: CreateRevenuePayload): Promise<Revenue> {
  const { data } = await api.post("revenues/", payload);
  return data;
}

export async function getRevenue(revenueId: string): Promise<Revenue> {
  const { data } = await api.get(`revenues/${revenueId}/`);
  return data;
}

export async function updateRevenue(
  revenueId: string,
  payload: CreateRevenuePayload
): Promise<Revenue> {
  const { data } = await api.put(`revenues/${revenueId}/`, payload);
  return data;
}

export async function deleteRevenue(revenueId: string): Promise<void> {
  await api.delete(`revenues/${revenueId}/`);
}
