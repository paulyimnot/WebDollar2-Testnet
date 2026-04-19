import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useExplorer() {
  const { data: blocksData } = useQuery({
    queryKey: [api.explorer.blocks.path],
    queryFn: async () => {
      const res = await fetch(api.explorer.blocks.path + "?limit=50&offset=0");
      if (!res.ok) throw new Error("Failed to fetch blocks");
      return await res.json();
    },
    refetchInterval: 10000,
  });

  const { data: txData } = useQuery({
    queryKey: [api.explorer.transactions.path],
    queryFn: async () => {
      const res = await fetch(api.explorer.transactions.path + "?limit=50&offset=0");
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return await res.json();
    },
    refetchInterval: 5000,
  });

  return { 
    blocks: blocksData?.blocks || [], 
    totalBlocks: blocksData?.totalCount || 0,
    transactions: txData?.transactions || [],
    totalTransactions: txData?.totalCount || 0
  };
}
