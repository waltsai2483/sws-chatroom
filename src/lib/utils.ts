import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const randomID = (length: number) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < length; i++) {
    const char = characters.charAt(Math.floor(Math.random() * characters.length));
    result += (Math.random() < 0.5) ? char.toLowerCase() : char.toUpperCase();
  }
  return result;
}