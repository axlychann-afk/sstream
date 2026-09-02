import { useQuery } from "@tanstack/react-query";

export interface PopularItem {
  title: string;
  short_title: string;
  slug: string;
  url: string;
  episode: string;
  type: string;
  sub_status: string;
  is_hot: boolean;
  image: string | null;
  image_alt: string;
  rel: string;
}

interface PopularResponse {
  status: boolean;
  total: number;
  results: PopularItem[];
}

async function fetchPopular(): Promise<PopularResponse> {
  const res = await fetch("/api/donghua/popular");
  if (!res.ok) throw new Error("Failed to fetch popular donghua");
  return res.json();
}

export function useGetPopular() {
  return useQuery<PopularResponse>({
    queryKey: ["popular"],
    queryFn: fetchPopular,
    staleTime: 5 * 60 * 1000,
  });
}
