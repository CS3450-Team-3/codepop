export interface Drink {
  DrinkID: string;
  Name: string;
  SyrupsUsed?: string[] | null;
  SodaUsed: string[];
  AddIns?: string[] | null;
  Rating?: number | null;
  Price: number;
  Size?: string;
  Ice?: string;
  User_Created: boolean;
  Favorite?: string[];
}
