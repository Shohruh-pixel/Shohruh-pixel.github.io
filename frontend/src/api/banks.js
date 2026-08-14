import { request } from "./http";

export function getBanks() {
  return request("/banks");
}

