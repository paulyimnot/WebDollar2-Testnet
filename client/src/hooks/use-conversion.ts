import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertConversionRequest } from "@shared/routes";
import { useToast } from "./use-toast";

export function useConversion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: [api.conversion.list.path],
    queryFn: async () => {
      const res = await fetch(api.conversion.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversion requests");
      return await res.json();
    },
  });

  const createRequest = useMutation({
    mutationFn: async (data: InsertConversionRequest) => {
      const res = await fetch(api.conversion.create.path, {
        method: api.conversion.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit request");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversion.list.path] });
      toast({
        title: "REQUEST SUBMITTED",
        description: "Your conversion request is pending review. The team will verify your deposit on the burn address and credit your WDollar 2 tokens once confirmed.",
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "ERROR",
        description: error.message,
        variant: "destructive",
        className: "font-mono border-destructive bg-black text-destructive",
      });
    },
  });

  return {
    requests,
    isLoading,
    submitRequest: createRequest.mutate,
    isSubmitting: createRequest.isPending,
  };
}
