export interface Revenue {
  RevenueID: string;
  OrderID: string;
  TotalAmount?: number | null;
  SaleDate?: string;
  Refunded?: boolean;
}

export interface StoreRevenueInfo {
  ServerID: string;
  StoreName: string;
  StoreAddress: string;
  Revenues: Revenue[] | { error: string; details: string };
}

export interface GlobalRevenueResponse {
  results: {
    [regionName: string]: {
      [serverID: string]: StoreRevenueInfo;
    };
  };
}

export interface CreateRevenuePayload {
  OrderID: string;
  TotalAmount?: number | null;
  SaleDate?: string;
  Refunded?: boolean;
}
