import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowLeft, Server } from "lucide-react-native";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

import { colors } from "@/theme/colors";
import { Card } from "@/ui/Card";
import { PrimaryButton } from "@/ui/PrimaryButton";
import { Screen } from "@/ui/Screen";
import { getApiBaseUrl, setApiBaseUrl } from "@/shared/storage/apiConfigStorage";

export default function ServerUrlScreen() {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const current = await getApiBaseUrl();
    setUrl(current);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    let trimmed = url.trim();
    if (!trimmed) {
      Toast.show({ type: "info", text1: "서버 주소를 입력하세요." });
      return;
    }
    // IP만 입력한 경우 http:// 와 :8080 보정 (예: 192.168.219.44 → http://192.168.219.44:8080)
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      trimmed = "http://" + trimmed;
    }
    if (!trimmed.match(/:\d+\/?$/)) {
      trimmed = trimmed.replace(/\/+$/, "") + ":8080";
    }
    trimmed = trimmed.replace(/\/+$/, "");

    setSaving(true);
    try {
      await setApiBaseUrl(trimmed);
      setUrl(trimmed);
      Toast.show({ type: "success", text1: "저장되었습니다. 일자리/기록 목록에서 사용됩니다." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>서버 연결 설정</Text>
      </View>

      <View style={styles.iconRow}>
        <View style={styles.iconCircle}>
          <Server color={colors.primary} size={32} />
        </View>
      </View>

      <Text style={styles.paragraph}>
        앱이 일자리·기록 데이터를 불러올 백엔드(Spring) 주소입니다. 실기기에서는 맥 IP가 필요합니다.
      </Text>

      {url.includes("localhost") ? (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ 실기기에서는 localhost로 연결되지 않습니다</Text>
          <Text style={styles.warningText}>
            지금 휴대폰(실기기)에서 실행 중이라면, 아래 칸에 맥 IP(예: 192.168.0.5)로 http://IP:8080 형태로 입력한 뒤 저장하세요.
          </Text>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.label}>서버 주소</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.0.5:8080"
          placeholderTextColor={colors.mutedText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          시뮬레이터: http://localhost:8080{"\n"}
          실기기: 맥 터미널에서 ipconfig getifaddr en0 로 IP 확인 후 http://IP:8080
        </Text>
      </Card>

      <PrimaryButton
        label={saving ? "저장 중..." : "저장"}
        onPress={handleSave}
        style={styles.saveButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(47, 143, 107, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  paragraph: {
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 20,
    marginBottom: 16,
  },
  warningCard: {
    marginBottom: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C2410C",
    marginBottom: 6,
  },
  warningText: {
    fontSize: 13,
    color: "#9A3412",
    lineHeight: 18,
  },
  card: {
    gap: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 8,
  },
});
