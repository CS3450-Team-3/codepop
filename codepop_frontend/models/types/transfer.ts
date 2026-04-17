export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface TransferRequest {
  RequestID: number;
  FromServer: string;
  FromServerName: string;
  ToServer: string;
  ToServerName: string;
  ItemName: string;
  Quantity: number;
  Status: TransferStatus;
  RequestedBy: string;
  CreatedAt: string;
  Notes: string;
}

export interface CreateTransferRequestPayload {
  FromServer: string;
  ToServer: string;
  ItemName: string;
  Quantity: number;
  Notes?: string;
}
