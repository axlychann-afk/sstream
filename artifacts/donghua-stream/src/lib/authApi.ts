// Thin fetch wrapper for auth/profile/comments — cookies (session) are sent
// automatically via `credentials: "include"`. In dev the Vite proxy forwards
// /api to the local Express server on the same origin as the browser, so
// this works without any CORS/credentials gymnastics.
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export class ApiRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE || ""}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiRequestError(message, res.status);
  }
  return body as T;
}

export type PublicUser = {
  id: number;
  displayName: string;
  avatarSeed: string;
  bio?: string;
};

export type CommentDto = {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  displayName: string;
  avatarSeed: string;
};

export const authApi = {
  me: () => request<{ user: PublicUser | null }>("/auth/me"),
  register: (data: { email: string; password: string; displayName: string }) =>
    request<{ user: PublicUser }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ user: PublicUser }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  updateProfile: (data: { displayName?: string; bio?: string; avatarSeed?: string }) =>
    request<{ user: PublicUser }>("/profile", { method: "PATCH", body: JSON.stringify(data) }),
};

export const commentsApi = {
  list: (seriesSlug: string, episodeSlug: string) =>
    request<{ comments: CommentDto[] }>(
      `/comments?seriesSlug=${encodeURIComponent(seriesSlug)}&episodeSlug=${encodeURIComponent(episodeSlug)}`,
    ),
  create: (data: { seriesSlug: string; episodeSlug: string; content: string }) =>
    request<{ comment: CommentDto }>("/comments", { method: "POST", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/comments/${id}`, { method: "DELETE" }),
};

// Fixed, pre-approved avatar presets (DiceBear "thumbs" style, seeded) — users
// pick one of these instead of uploading arbitrary images, so profile
// pictures can never contain adult/NSFW content.
export const AVATAR_PRESETS = [
  "aurora", "blaze", "comet", "drift", "ember", "frost",
  "glow", "haze", "jade", "koi", "lotus", "nova",
];

export function avatarUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;
}
