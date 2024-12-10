
import { atom } from 'recoil';

// Initialize the number atom
export const decimals = atom({
  key: 'decimals', // unique key for this atom
  default: 0 // initial value
});