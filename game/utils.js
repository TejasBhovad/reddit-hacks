import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function sendToDevvit(event) {
  window.parent?.postMessage(event, "*");
}
