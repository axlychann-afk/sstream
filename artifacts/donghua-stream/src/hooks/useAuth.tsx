import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, type PublicUser } from "@/lib/authApi";

const ME_KEY = ["auth", "me"];

type AuthContextValue = {
  user: PublicUser | null | undefined;
  isLoading: boolean;
  login: (data: { email: string; password: string }) => Promise<PublicUser>;
  register: (data: { email: string; password: string; displayName: string }) => Promise<PublicUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: () => authApi.me().then((r) => r.user),
    staleTime: 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => queryClient.setQueryData(ME_KEY, res.user),
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => queryClient.setQueryData(ME_KEY, res.user),
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => queryClient.setQueryData(ME_KEY, null),
  });

  return (
    <AuthContext.Provider
      value={{
        user: data,
        isLoading,
        login: (d) => loginMutation.mutateAsync(d).then((r) => r.user),
        register: (d) => registerMutation.mutateAsync(d).then((r) => r.user),
        logout: () => logoutMutation.mutateAsync(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
