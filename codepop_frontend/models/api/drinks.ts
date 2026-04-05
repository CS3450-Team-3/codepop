import api from "./api";
import { Drink } from "@/models/types/drink";

export async function getDrinks(): Promise<Drink[]> {
  const { data } = await api.get("drinks/");
  return data;
}

export async function getDrink(drinkId: string): Promise<Drink> {
  const { data } = await api.get(`drinks/${drinkId}/`);
  return data;
}

export async function createDrink(payload: Omit<Drink, "DrinkID">): Promise<Drink> {
  const { data } = await api.post("drinks/", payload);
  return data;
}

export async function updateDrink(drinkId: string, payload: Omit<Drink, "DrinkID">): Promise<Drink> {
  const { data } = await api.put(`drinks/${drinkId}/`, payload);
  return data;
}

export async function favoriteDrink(drinkId: string, userId: string): Promise<Drink> {
  const { data } = await api.put(`drinks/${drinkId}/`, {
    addFavorite: [userId],
  });
  return data;
}

export async function unfavoriteDrink(drinkId: string, userId: string): Promise<Drink> {
  const { data } = await api.put(`drinks/${drinkId}/`, {
    removeFavorite: [userId],
  });
  return data;
}

export async function deleteDrink(drinkId: string): Promise<void> {
  await api.delete(`drinks/${drinkId}/`);
}

export async function getUserDrinks(userId: string): Promise<Drink[]> {
  const { data } = await api.get(`users/${userId}/drinks/`);
  return data;
}

export async function getMenu(): Promise<Drink[]> {
  const { data } = await api.get("menu/");
  return data;
}

export async function generateGuestDrink(): Promise<Record<string, unknown>> {
  const { data } = await api.get("generate/");
  return data;
}

export async function generateUserDrink(userId: string): Promise<Record<string, unknown>> {
  const { data } = await api.get(`generate/${userId}/`);
  return data;
}
