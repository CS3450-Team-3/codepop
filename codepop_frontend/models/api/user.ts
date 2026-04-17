import api from "./api";
import { GetUser, UserProfile, PatchedUserProfile } from "@/models/types/user";

export async function getUsers(): Promise<GetUser[]> {
  const { data } = await api.get("users/");
  return data;
}

export async function createUser(payload: Omit<GetUser, "id" | "is_staff" | "is_superuser">): Promise<GetUser> {
  const { data } = await api.post("users/", payload);
  return data;
}

export async function deleteCurrentUser(): Promise<void> {
  await api.delete("users/");
}

export async function getMe(): Promise<UserProfile> {
  const { data } = await api.get("users/me/");
  return data;
}

export async function updateMe(payload: PatchedUserProfile): Promise<UserProfile> {
  const { data } = await api.patch("users/me/", payload);
  return data;
}

export async function getUserById(userId: string): Promise<GetUser> {
  const { data } = await api.get(`users/delete/${userId}/`);
  return data;
}

export async function deleteUserById(userId: string): Promise<void> {
  await api.delete(`users/delete/${userId}/`);
}

export async function editUserById(
  userId: string,
  payload: Omit<GetUser, "id" | "is_staff" | "is_superuser">
): Promise<GetUser> {
  const { data } = await api.post(`users/edit/${userId}/`, payload);
  return data;
}

export async function getUserEditById(userId: string): Promise<GetUser> {
  const { data } = await api.get(`users/edit/${userId}/`);
  return data;
}
