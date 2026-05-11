import { useQuery } from "@tanstack/react-query";
import api from "../utils/api.js";

export function useBadges() {
  return useQuery({
    queryKey: ["badges"],
    queryFn: () => api.get("/badges")
  });
}
