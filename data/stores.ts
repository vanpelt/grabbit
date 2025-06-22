export interface Store {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

export const storeMapping: { [key: string]: string[] } = {
  grocery: ["grocery", "supermarket", "convenience_store"],
  pharmacy: ["pharmacy"],
  hardware: ["hardware_store"],
  electronics: ["electronics_shop"],
  clothing: ["clothing_store"],
  bookstore: ["bookstore"],
  department: ["department_store"],
};

export const sampleStores: Store[] = [
    { name: 'Safeway Downtown', lat: 37.7749, lng: -122.4194, type: 'grocery' },
    { name: 'CVS Pharmacy', lat: 37.7849, lng: -122.4094, type: 'pharmacy' },
    { name: 'Target Mission', lat: 37.7649, lng: -122.4294, type: 'department' },
    { name: 'Home Depot SOMA', lat: 37.7549, lng: -122.3994, type: 'hardware' },
    { name: 'Best Buy Union Square', lat: 37.7849, lng: -122.4094, type: 'electronics' }
]; 