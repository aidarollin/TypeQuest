import { useQuery } from "@tanstack/react-query";
import api from "../utils/api.js";

export function useOverview() {
  return useQuery({
    queryKey: ["stats", "overview"],
    queryFn: () => api.get("/stats/overview"),
    refetchInterval: 30_000
  });
}

export function useRange(period = "30") {
  return useQuery({
    queryKey: ["stats", "range", period],
    queryFn: () => api.get(`/stats/range?period=${period}`)
  });
}
