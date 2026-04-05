export type OrderStatus = "Pending" | "Processing" | "Completed" | "Cancelled";
export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Remade";

export interface Order {
  OrderID: string;
  UserID?: string | null;
  OriginatingServer?: string | null;
  Drinks: string[];
  OrderStatus?: OrderStatus;
  PaymentStatus?: PaymentStatus;
  PickupTime?: string | null;
  CreationTime: string;
  LockerCombo?: number | null;
  StripeID?: string | null;
  Synced?: boolean;
}

export interface CreateOrderPayload {
  UserID?: string | null;
  OriginatingServer?: string | null;
  Drinks: string[];
  OrderStatus?: OrderStatus;
  PaymentStatus?: PaymentStatus;
  PickupTime?: string | null;
  LockerCombo?: number | null;
  StripeID?: string | null;
  Synced?: boolean;
}
