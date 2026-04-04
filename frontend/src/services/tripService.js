import { apiClient } from "./api";

export const submitTripRequest = async (tripDetails) => {
  const response = await apiClient.post("/orchestrate-trip", tripDetails);
  return response.data;
};
