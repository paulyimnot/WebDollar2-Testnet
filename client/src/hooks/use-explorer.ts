import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useExplorer() {
  const { data: blocks } = useQuery({
    queryKey: [api.explorer.blocks.path],
    queryFn: async () => {
      const res = await fetch(api.explorer.blocks.path);
      if (!res.ok) throw new Error("Failed to fetch blocks");
      return await res.json();
    },
    refetchInterval: 10000,
  });

  const { data: transactions } = useQuery({
    queryKey: [api.explorer.transactions.path],
    queryFn: async () => {
      const res = await fetch(api.explorer.transactions.path);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return await res.json();
    },
    refetchInterval: 5000,
  });

  return { blocks, transactions };
}
