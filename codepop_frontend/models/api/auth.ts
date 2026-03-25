import api, { setAccessToken } from "./api";
import { User } from "@/models/types/user";

export async function signIn(email: string, password: string) {
    const response = await fetch("/backend/auth/login/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

  setAccessToken(data.access);

  // This is to fetch the user data immediately after login, so we can store it in context and avoid an extra API call on page load
  const user = await api.get("users/me/");

  return user.data;
}

export async function signUp(email: string, password: string, firstName: string, lastName: string) {
    const response = await fetch("/backend/auth/register/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to sign up");
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