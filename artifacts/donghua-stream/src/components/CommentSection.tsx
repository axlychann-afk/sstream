import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Trash2 } from "lucide-react";
import { commentsApi, avatarUrl, ApiRequestError } from "@/lib/authApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const units: [number, string][] = [
    [60, "s"], [60, "m"], [24, "h"], [7, "d"], [4.345, "w"], [12, "mo"], [Infinity, "y"],
  ];
  let value = seconds;
  for (const [amount, label] of units) {
    if (value < amount) return `${Math.max(1, Math.floor(value))}${label} ago`;
    value /= amount;
  }
  return "just now";
}

export function CommentSection({ seriesSlug, episodeSlug }: { seriesSlug: string; episodeSlug: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryKey = ["comments", seriesSlug, episodeSlug];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => commentsApi.list(seriesSlug, episodeSlug).then((r) => r.comments),
    enabled: !!seriesSlug && !!episodeSlug,
  });

  const postMutation = useMutation({
    mutationFn: () => commentsApi.create({ seriesSlug, episodeSlug, content: content.trim() }),
    onSuccess: () => {
      setContent("");
      setError(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : "Failed to post comment."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => commentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const comments = data ?? [];

  return (
    <div className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h2 className="flex items-center gap-2 font-bold text-lg mb-4">
          <MessageCircle className="w-5 h-5 text-primary" />
          Comments {comments.length > 0 && <span className="text-muted-foreground font-normal text-sm">({comments.length})</span>}
        </h2>

        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (content.trim()) postMutation.mutate();
            }}
            className="flex gap-3 mb-6"
          >
            <img src={avatarUrl(user.avatarSeed)} alt="" className="w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder={`Comment on episode ${episodeSlug}...`}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-muted-foreground">Text only · be respectful, no toxic content.</span>
                <Button type="submit" size="sm" disabled={!content.trim() || postMutation.isPending}>
                  {postMutation.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
              {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </div>
          </form>
        ) : (
          <div className="mb-6 text-sm text-muted-foreground bg-secondary/40 border border-border rounded-lg p-3">
            <Link href="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>{" "}
            to leave a comment on this episode.
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-secondary/40 animate-pulse" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to say something!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <img src={avatarUrl(c.avatarSeed)} alt="" className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{c.displayName}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground/90 break-words whitespace-pre-wrap">{c.content}</p>
                </div>
                {user?.id === c.userId && (
                  <button
                    onClick={() => deleteMutation.mutate(c.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0 h-fit"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
