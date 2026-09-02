import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { authApi, ApiRequestError, AVATAR_PRESETS, avatarUrl } from "@/lib/authApi";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setBio(user.bio ?? "");
      setAvatarSeed(user.avatarSeed);
    }
  }, [user]);

  if (!user) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await authApi.updateProfile({ displayName, bio, avatarSeed });
      queryClient.setQueryData(["auth", "me"], res.user);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen px-4 pt-24 pb-12 flex justify-center">
      <Helmet>
        <title>Profile Settings | DonghuaStream</title>
      </Helmet>
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-sm h-fit">
        <h1 className="text-2xl font-bold mb-1">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Keep your profile appropriate — no adult content in your name, bio, or avatar.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((seed) => (
                <button
                  type="button"
                  key={seed}
                  onClick={() => setAvatarSeed(seed)}
                  className={cn(
                    "w-12 h-12 rounded-full overflow-hidden border-2 transition-all",
                    avatarSeed === seed ? "border-primary scale-105" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img src={avatarUrl(seed)} alt={`Avatar option ${seed}`} className="w-full h-full" />
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Avatars are picked from a fixed set of safe illustrations — no image uploads.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Display name</label>
            <Input required minLength={2} maxLength={32} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
            <textarea
              maxLength={200}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Tell others a bit about yourself"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-primary">Profile updated.</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await logout();
                setLocation("/");
              }}
            >
              Log Out
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
