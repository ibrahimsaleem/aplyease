import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get JWT token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

// Set JWT token in localStorage
export function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
}

// Remove JWT token from localStorage
export function removeAuthToken(): void {
  localStorage.removeItem('authToken');
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Compute API base URL
  // Prefer Vite env var for split deployments (e.g., Firebase + Render)
  const apiUrl = (import.meta as any).env?.VITE_API_URL
    || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://aplyeaseportal.onrender.com');
  
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    "Accept": "application/json"
  };

  // Add JWT token to Authorization header if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${apiUrl}${url}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};

    // Compute API base URL similar to apiRequest
    const apiUrl = (import.meta as any).env?.VITE_API_URL
      || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://aplyeaseportal.onrender.com');
    
    // Add JWT token to Authorization header if available
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const path = queryKey.join("/") as string;
    const url = path.startsWith("/") ? `${apiUrl}${path}` : `${apiUrl}/${path}`;
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
