import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL as envDefault } from "@/shared/api/config";

const API_BASE_URL_KEY = "apiBaseUrl";

/** 주소만 넣었을 때 http:// 와 :8080 보정 (예: 192.168.219.44 → http://192.168.219.44:8080) */
function normalizeBaseUrl(input: string): string {
  let s = input.trim().replace(/\/+$/, "");
  if (!s) return s;
  if (!s.startsWith("http://") && !s.startsWith("https://")) s = "http://" + s;
  if (!s.match(/:\d+\/?$/)) s = s + ":8080";
  return s.replace(/\/+$/, "");
}

export async function getApiBaseUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(API_BASE_URL_KEY);
  const trimmed = stored?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.replace(/\/$/, "") : envDefault;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  const normalized = normalizeBaseUrl(url);
  await AsyncStorage.setItem(API_BASE_URL_KEY, normalized);
}

/** 설정에 저장된 값이 없을 때 쓰는 기본 주소 (config 기준). */
export const getApiBaseUrlDefault = (): string => envDefault;
