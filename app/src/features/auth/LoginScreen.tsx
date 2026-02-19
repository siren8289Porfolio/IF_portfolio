import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { QrCode, Shield, Smartphone, Link } from "lucide-react-native";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

import { colors } from "@/theme/colors";
import { Card } from "@/ui/Card";
import { PrimaryButton } from "@/ui/PrimaryButton";
import { Screen } from "@/ui/Screen";
import { setAuthenticated } from "@/shared/storage/authStorage";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(async () => {
      await setAuthenticated(true);
      Toast.show({ type: "success", text1: "본인 인증이 완료되었습니다." });
      router.replace("/home");
    }, 800);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Shield color="#FFFFFF" size={40} />
        </View>
        <Text style={styles.title}>If</Text>
        <Text style={styles.subtitle}>노약자 고용 위험도 판단 시스템</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>간편 인증</Text>
        <Text style={styles.cardSubtitle}>
          아래 방법 중 하나를 선택하여{"\n"}본인 인증을 진행해주세요.
        </Text>

        <View style={styles.methodGrid}>
          <View style={styles.method}>
            <Smartphone color={colors.text} size={24} />
            <Text style={styles.methodLabel}>문자 링크</Text>
          </View>
          <View style={styles.method}>
            <QrCode color={colors.text} size={24} />
            <Text style={styles.methodLabel}>QR 코드</Text>
          </View>
          <View style={styles.method}>
            <Link color={colors.text} size={24} />
            <Text style={styles.methodLabel}>전달 링크</Text>
          </View>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.divider} />
        </View>

        <PrimaryButton
          label={loading ? "인증 중..." : "원터치 간편 인증하기"}
          onPress={handleLogin}
          disabled={loading}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.mutedText,
  },
  card: {
    gap: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
  methodGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  method: {
    flex: 1,
    backgroundColor: colors.muted,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.mutedText,
  },
});
