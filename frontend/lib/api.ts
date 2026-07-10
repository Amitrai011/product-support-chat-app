import type {
  AuthResponse,
  Conversation,
  Message,
  Product,
  Role,
  User,
} from './types';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const TOKEN_KEY = 'luxe.token';

export const tokenStore = {
  get: () =>
    typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ?? message);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  register: (data: {
    email: string;
    name: string;
    password: string;
    role: Role;
  }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<User>('/auth/me'),

  listProducts: () => request<Product[]>('/products'),

  listConversations: () => request<Conversation[]>('/conversations'),

  openConversation: (productId: string) =>
    request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),

  getConversation: (id: string) =>
    request<Conversation>(`/conversations/${id}`),

  getMessages: (id: string) =>
    request<Message[]>(`/conversations/${id}/messages`),
};

export { ApiError };
