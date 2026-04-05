export type UserType =
  | "customer"
  | "store_manager"
  | "logistics_manager"
  | "repair_staff"
  | "admin"
  | "super_admin";

export interface User {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  user_type?: UserType;
  home_server?: string | null;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  user_type?: UserType;
}

export interface GetUser {
  id: string;
  username: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  is_staff: boolean;
  is_superuser: boolean;
  user_type?: UserType;
}

export interface UserProfile {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  user_type?: UserType;
  home_server?: string | null;
}

export interface PatchedUserProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
  user_type?: UserType;
  home_server?: string | null;
}
