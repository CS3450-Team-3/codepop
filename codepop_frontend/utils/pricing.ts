import { Drink } from '@/models/types/drink';

export const SIZE_UPCHARGES: Record<string, number> = {
  'small': 0.00,
  'medium': 0.50,
  'large': 1.00,
  '16oz': 0.00,
  '24oz': 0.50,
  '32oz': 1.00,
};

export const SYRUP_UPCHARGE = 0.50;
export const ADDIN_UPCHARGE = 0.00;

export function calculateDrinkPrice(drink: Drink): number {
  const basePrice = drink.Price || 0;
  
  // Size upcharge
  const sizeKey = (drink.Size || '16oz').toLowerCase();
  const sizeUpcharge = SIZE_UPCHARGES[sizeKey] || 0;

  // Syrup cost
  const syrupsCost = (drink.SyrupsUsed?.length || 0) * SYRUP_UPCHARGE;

  // Add-ins cost
  const addinsCost = (drink.AddIns?.length || 0) * ADDIN_UPCHARGE;

  return basePrice + sizeUpcharge + syrupsCost + addinsCost;
}
