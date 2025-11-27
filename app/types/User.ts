export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'user' | 'guest';
  createdAt?: string;
  updatedAt?: string;
}
