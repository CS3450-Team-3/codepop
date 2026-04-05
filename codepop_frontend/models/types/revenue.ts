export interface Revenue {
  RevenueID: string;
  OrderID: string;
  TotalAmount?: number | null;
  SaleDate?: string;
  Refunded?: boolean;
}

export interface CreateRevenuePayload {
  OrderID: string;
  TotalAmount?: number | null;
  SaleDate?: string;
  Refunded?: boolean;
}
