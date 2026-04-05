import api from "./api";
import { InventoryReportResponse } from "@/models/types/inventory";
import { Revenue } from "@/models/types/revenue";
import { Order } from "@/models/types/order";

export async function getDashboardInventoryReport(): Promise<InventoryReportResponse> {
  const { data } = await api.get("inventory/report/");
  return data;
}

export async function getDashboardRevenues(): Promise<Revenue[]> {
  const { data } = await api.get("revenues/");
  return data;
}

export async function getDashboardOrders(): Promise<Order[]> {
  const { data } = await api.get("orders/");
  return data;
}
