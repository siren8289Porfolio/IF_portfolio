import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { UserCheck, ArrowRight } from "lucide-react-native";
import { router } from "expo-router";
import Toast from "react-native-toast-message";

import { colors } from "@/theme/colors";
import { Card } from "@/ui/Card";
import { PrimaryButton } from "@/ui/PrimaryButton";
import { Screen } from "@/ui/Screen";
import { getAuthenticated } from "@/shared/storage/authStorage";

export default function GuideScreen() {
  useEffect(() => {
    const guard = async () => {
      const isAuth = await getAuthenticated();
      if (!isAuth) {
        Toast.show({ type: "error", text1: "본인 인증이 필요합니다." });
        router.replace("/login");
      }
    };
    guard();
  }, []);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <UserCheck color={colors.primary} size={44} />
        </View>
        <Text style={styles.title}>
          <Text style={styles.titleHighlight}>회원</Text>님,{"\n"}
          선택 가능한 일자리가{"\n"}있습니다
        </Text>
        <Text style={styles.subtitle}>
          안전하고 적합한 일자리를{"\n"}가사조사관과 함께 확인해보세요.
        </Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>사용 안내</Text>
          <Text style={styles.cardText}>
            화면에 표시되는 위험도와 근무 조건을{"\n"}꼼꼼히 확인하신 후 선택해주세요.
          </Text>
        </Card>

        <PrimaryButton
          label="일자리 확인하기"
          onPress={() => router.push("/job-list")}
          icon={<ArrowRight color="#FFFFFF" size={18} />}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(47, 143, 107, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    lineHeight: 30,
  },
  titleHighlight: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedText,
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  cardText: {
    fontSize: 12,
    color: colors.mutedText,
    textAlign: "center",
    lineHeight: 18,
  },
});
