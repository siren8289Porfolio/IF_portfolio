import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Activity, ArrowLeft, Calendar, Check } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import Toast from "react-native-toast-message";

import { colors } from "@/theme/colors";
import { getAuthenticated } from "@/shared/storage/authStorage";
import { setSelectedJobId } from "@/shared/storage/selectionStorage";
import { Card } from "@/ui/Card";
import { PrimaryButton } from "@/ui/PrimaryButton";
import { Screen } from "@/ui/Screen";
import { fetchJobs } from "@/shared/api/jobs";
import type { Job } from "@/shared/types/job";

function mapApiToJob(r: { id: number; jobTitle: string; workplace: string; workHours: string; description: string }): Job {
  return {
    id: String(r.id),
    title: r.jobTitle,
    hours: r.workHours,
    riskScore: 0,
    riskLevel: "보통",
    description: r.description || "",
    conditions: [r.workHours, r.workplace].filter(Boolean),
    reasons: { force: "", repetition: "", accident: "" },
  };
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showConfirm, setShowConfirm] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchJobs();
        const mapped = list.map(mapApiToJob);
        const found = mapped.find((item) => item.id === id);
        if (!cancelled) setJob(found ?? null);
      } catch {
        if (!cancelled) setJob(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!job) {
    return (
      <Screen>
        <Text style={styles.emptyText}>일자리를 찾을 수 없습니다.</Text>
        <PrimaryButton label="목록으로" onPress={() => router.replace("/job-list")} />
      </Screen>
    );
  }

  const riskColor = job.riskScore >= 70 ? "#E5533D" : job.riskScore >= 40 ? "#F4B740" : "#4CAF50";
  const riskBg = job.riskScore >= 70 ? "#FEE2E2" : job.riskScore >= 40 ? "#FEF3C7" : "#DCFCE7";

  const handleSelect = async () => {
    await setSelectedJobId(job.id);
    setShowConfirm(false);
    router.push("/selection-complete");
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/job-list")} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>직무 상세</Text>
      </View>

      <View style={styles.stack}>
        <Card style={styles.card}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobDescription}>{job.description}</Text>
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Calendar color={colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>근무 조건 요약</Text>
          </View>
          {job.conditions.map((condition) => (
            <View key={condition} style={styles.conditionItem}>
              <Check color={colors.primary} size={16} />
              <Text style={styles.conditionText}>{condition}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Activity color={riskColor} size={18} />
            <Text style={styles.sectionTitle}>위험도 분석</Text>
            <View style={[styles.riskBadge, { backgroundColor: riskBg }]}>
              <Text style={[styles.riskBadgeText, { color: riskColor }]}>
                {job.riskLevel} ({job.riskScore}%)
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${job.riskScore}%`, backgroundColor: riskColor }]} />
          </View>
          <Text style={styles.reasonTitle}>왜 이 위험도인가요?</Text>
          <View style={styles.reasonCard}>
            <Text style={styles.reasonLabel}>💪 힘 사용 정도</Text>
            <Text style={styles.reasonText}>{job.reasons.force}</Text>
          </View>
          <View style={styles.reasonCard}>
            <Text style={styles.reasonLabel}>🔄 반복 작업</Text>
            <Text style={styles.reasonText}>{job.reasons.repetition}</Text>
          </View>
          <View style={styles.reasonCard}>
            <Text style={styles.reasonLabel}>⚠️ 이동·사고 위험</Text>
            <Text style={styles.reasonText}>{job.reasons.accident}</Text>
          </View>
        </Card>
      </View>

      <PrimaryButton label="이 일자리 선택하기" onPress={() => setShowConfirm(true)} style={styles.selectButton} />

      {showConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>이 일자리를 선택하시겠습니까?</Text>
            <Text style={styles.modalText}>
              선택하신 내용은 담당 가사조사관과{"\n"}행정 담당자에게 전달됩니다.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowConfirm(false)}>
                <Text style={styles.modalCancelText}>아니오</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={handleSelect}>
                <Text style={styles.modalConfirmText}>예, 선택합니다</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
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
  stack: {
    gap: 16,
  },
  card: {
    gap: 10,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  jobDescription: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  conditionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conditionText: {
    color: colors.text,
    fontSize: 13,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressTrack: {
    height: 10,
    backgroundColor: colors.muted,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  reasonTitle: {
    marginTop: 8,
    fontWeight: "700",
    color: colors.text,
  },
  reasonCard: {
    backgroundColor: colors.muted,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  reasonText: {
    fontSize: 12,
    color: colors.mutedText,
  },
  selectButton: {
    marginTop: 16,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  modalText: {
    fontSize: 12,
    color: colors.mutedText,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.muted,
    alignItems: "center",
  },
  modalCancelText: {
    fontWeight: "600",
    color: colors.text,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  modalConfirmText: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyText: {
    marginBottom: 16,
    color: colors.mutedText,
    textAlign: "center",
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
