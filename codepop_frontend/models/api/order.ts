import api from "./api";
import { Order, CreateOrderPayload } from "@/models/types/order";

export async function getOrders(): Promise<Order[]> {
  const { data } = await api.get("orders/");
  return data;
}

export async function getOrder(orderId: string): Promise<Order> {
  const { data } = await api.get(`orders/${orderId}/`);
  return data;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await api.post("orders/", payload);
  return data;
}

export async function updateOrder(orderId: string, payload: CreateOrderPayload): Promise<Order> {
  const { data } = await api.put(`orders/${orderId}/`, payload);
  return data;
}

export async function deleteOrder(orderId: string): Promise<void> {
  await api.delete(`orders/${orderId}/`);
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const { data } = await api.get(`users/${userId}/orders/`);
  return data;
}

export async function createUserOrder(userId: string, payload: CreateOrderPayload): Promise<Order> {
  const { data } = await api.post(`users/${userId}/orders/`, payload);
  return data;
}

export async function getUserOrder(userId: string, orderId: string): Promise<Order> {
  const { data } = await api.get(`users/${userId}/orders/${orderId}/`);
  return data;
}

export async function updateUserOrder(
  userId: string,
  orderId: string,
  payload: CreateOrderPayload
): Promise<Order> {
  const { data } = await api.put(`users/${userId}/orders/${orderId}/`, payload);
  return data;
}

export async function deleteUserOrder(userId: string, orderId: string): Promise<void> {
  await api.delete(`users/${userId}/orders/${orderId}/`);
}

export async function getOrderEmailPreview(orderId: string): Promise<{ message: string }> {
  const { data } = await api.get(`email/${orderId}/`);
  return data;
}
