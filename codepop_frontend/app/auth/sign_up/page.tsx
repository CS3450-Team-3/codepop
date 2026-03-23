"use client";

import { useState } from "react";
import { useAuth } from "@/app/contextProviders/AuthContext";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    user_type: "",
  });

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    try {
      const data = await register(form);
      if (data.user_type === "customer") {
        router.push(`/store/customer`);
      } else if (data.user_type === "manager") {
        router.push(`/store/manager`);
      } else if (data.user_type === "admin") {
        router.push("/admin");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Username"
        onChange={(e) => setForm({ ...form, username: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <input
        placeholder="First Name"
        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
      />
      <input
        placeholder="Last Name"
        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
      />
      <input
        placeholder="User Type"
        onChange={(e) => setForm({ ...form, user_type: e.target.value })}
      />

      <button type="submit">Register</button>
    </form>
  );
}