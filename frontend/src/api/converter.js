import { request } from "./http";

export function convertCurrency(params) {
  const query = new URLSearchParams(params).toString();
  return request(`/converter?${query}`);
}

