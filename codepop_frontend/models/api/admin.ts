import api from "./api";
import { Server, MasterListSyncRequest, MasterListSyncResponse } from "@/models/types/server";

export async function getServers(): Promise<Server[]> {
  const { data } = await api.get("servers/");
  return data;
}

export async function getServer(serverId: string): Promise<Server> {
  const { data } = await api.get(`servers/${serverId}/`);
  return data;
}

export async function discoverServer(): Promise<Record<string, unknown>> {
  const { data } = await api.get("p2p/discover/");
  return data;
}

export async function joinP2PNetwork(payload: Record<string, unknown>): Promise<void> {
  await api.post("p2p/join/", payload);
}

export async function getMasterList(): Promise<MasterListSyncResponse> {
  const { data } = await api.get("sync/masterlist/");
  return data;
}

export async function syncMasterList(payload: MasterListSyncRequest): Promise<MasterListSyncResponse> {
  const { data } = await api.post("sync/masterlist/", payload);
  return data;
}
