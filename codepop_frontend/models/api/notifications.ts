import api from "./api";
import { Notification, CreateNotificationPayload } from "@/models/types/notification";

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await api.get("notifications/");
  return data;
}

export async function createNotification(payload: CreateNotificationPayload): Promise<Notification> {
  const { data } = await api.post("notifications/", payload);
  return data;
}

export async function getNotification(notificationId: number): Promise<Notification> {
  const { data } = await api.get(`notifications/${notificationId}/`);
  return data;
}

export async function updateNotification(
  notificationId: number,
  payload: CreateNotificationPayload
): Promise<Notification> {
  const { data } = await api.put(`notifications/${notificationId}/`, payload);
  return data;
}

export async function deleteNotification(notificationId: number): Promise<void> {
  await api.delete(`notifications/${notificationId}/`);
}

export async function getNotificationsByTimeRange(
  start: string,
  end: string
): Promise<Notification> {
  const { data } = await api.get("notifications/filter_by_time/", {
    params: { start, end },
  });
  return data;
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const { data } = await api.get(`users/${userId}/notifications/`);
  return data;
}
