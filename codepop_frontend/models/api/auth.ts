import api, { setAccessToken } from "./api";
import { User } from "@/models/types/user";

export async function login(username: string, password: string): Promise<User> {
  const { data } = await api.post("auth/login/", {
    username,
    password,
  });

  setAccessToken(data.access);

  const user = await api.get("users/me");

  return user.data;
}

export async function logout() {
  try {
    await api.post("auth/logout/");
  } finally {
    setAccessToken(null);
    window.location.href = "/auth/login";
  }
}

export async function register(payload: {
  username: string;
  password: string;
  first_name?: string;
  email?: string;
}): Promise<User> {
  const { data } = await api.post("auth/register/", payload);

  if (data && data.access) {
    setAccessToken(data.access);
    const user = await api.get("users/me");
    return user.data;
  } else {
    return Promise.reject(new Error("Registration failed or access token missing"));
  }
}