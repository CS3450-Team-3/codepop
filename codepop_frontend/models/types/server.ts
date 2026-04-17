export interface Server {
  ServerID: string;
  ServerURL: string;
  PublicKey: string;
  Status?: string;
  LastSeen: string;
  Region?: number | null;
  RegionName?: string;
  IsRegionLeader?: boolean;
  StoreName?: string;
  StoreAddress?: string;
  StoreCity?: string;
  StoreState?: string;
  StoreZip?: string;
}

export interface MasterListSyncItem {
  UserID: string;
  Username: string;
  HomeServerID: string;
}

export interface MasterListSyncRequest {
  items: MasterListSyncItem[];
}

export interface MasterListSyncResponse {
  status?: string;
  items?: MasterListSyncItem[];
}
