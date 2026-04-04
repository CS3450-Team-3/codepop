export interface TokenRefresh {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}
