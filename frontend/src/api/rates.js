import { request } from "./http";

export function getRates() {
  return request("/rates");
}

export function getBestRates() {
  return request("/rates/best");
}

