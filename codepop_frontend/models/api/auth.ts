import api, { setAccessToken } from "./api";
import { User } from "@/models/types/user";

export async function login(username: string, password: string): Promise<User> {
  const { data } = await api.post("auth/login/", {
    username,
    password,
  });

  setAccessToken(data.access);

  // This is to fetch the user data immediately after login, so we can store it in context and avoid an extra API call on page load
  const user = await api.get("users/me/");

  return user.data;
}

export async function logout() {
  try {
    await api.post("auth/logout/");
  } finally {
    setAccessToken(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }
}

export async function register(payload: {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email?: string;
  user_type?: string | "customer";
}): Promise<User> {
  const { data } = await api.post("auth/register/", payload);

  // After successful registration we log the user in by setting the access token and fetching their user data, so they don't have to log in manually right after registering
  if (data && data.access) {
    setAccessToken(data.access);
    const user = await api.get("users/me/");
    return user.data;
  } else {
    return Promise.reject(new Error("Registration failed: No access token returned"));
  }
}