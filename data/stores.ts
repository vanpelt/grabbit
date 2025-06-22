export interface Store {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export const storeMapping: { [key: string]: string[] } = {
  grocery: ['Safeway', 'Kroger', 'Walmart', 'Target', 'Whole Foods', 'Trader Joes'],
  pharmacy: ['CVS', 'Walgreens', 'Rite Aid', 'Pharmacy'],
  hardware: ['Home Depot', 'Lowes', 'Hardware Store', 'ACE Hardware'],
  electronics: ['Best Buy', 'Apple Store'],
  clothing: ['Macys', 'Target', 'Nordstrom', 'Gap', 'H&M'],
  bookstore: ['Barnes & Noble', 'Bookstore', 'Library'],
  department: ['Target', 'Walmart', 'Macys', 'Costco', 'Sams Club'],
};

export const sampleStores: Store[] = [
    { name: 'Safeway Downtown', lat: 37.7749, lng: -122.4194, type: 'grocery' },
    { name: 'CVS Pharmacy', lat: 37.7849, lng: -122.4094, type: 'pharmacy' },
    { name: 'Target Mission', lat: 37.7649, lng: -122.4294, type: 'department' },
    { name: 'Home Depot SOMA', lat: 37.7549, lng: -122.3994, type: 'hardware' },
    { name: 'Best Buy Union Square', lat: 37.7849, lng: -122.4094, type: 'electronics' }
]; 