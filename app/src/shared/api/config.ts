declare const process: { env?: { EXPO_PUBLIC_API_URL?: string } };

/**
 * 백엔드 API 주소. 웹에서 추가한 데이터를 앱에서 불러올 때 사용.
 * - iOS 시뮬레이터: localhost
 * - Android 에뮬레이터: 10.0.2.2 (호스트 맥)
 * - 실제 기기: .env에 EXPO_PUBLIC_API_URL=http://맥IP:8080
 */
const envUrl =
  typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL;

const getDefaultBaseUrl = (): string => {
  const { Platform } = require("react-native");
  return Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";
};

export const API_BASE_URL = envUrl || getDefaultBaseUrl();
