import { request } from "./http";

export function getLimits() {
  return request("/limits");
}

export function getLimitsByBank(bankId) {
  return request(`/limits/${bankId}`);
}

