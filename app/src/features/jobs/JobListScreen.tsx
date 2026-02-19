import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { colors } from "@/theme/colors";
import { getAuthenticated } from "@/shared/storage/authStorage";
import { getApiBaseUrl, setApiBaseUrl } from "@/shared/storage/apiConfigStorage";
import { Card } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { fetchAssessmentRecords, type AssessmentRecordResponse, type JobMatchDto } from "@/shared/api/assessments";
import { getRecords, setRecords } from "@/shared/storage/riskStorage";
import type { RiskRecord } from "@/shared/types/risk";

/** 배치 결과 목록에 쓸 항목: 매칭된 일자리 1건 + 어느 평가 건인지 */
export type MatchedJobItem = JobMatchDto & {
  assessmentId: string;
  applicantName: string;
  assessedAt: string;
};

function mapApiToRiskRecord(r: AssessmentRecordResponse): RiskRecord {
  return {
    id: String(r.id),
    age: r.age,
    job: r.jobTitle,
    physicalLevel: r.physicalLevel ?? "보통",
    hasMedicalCondition: false,
    workHours: "-",
    workIntensity: "-",
    riskScore: r.riskScore ?? 0,
    timestamp: r.assessedAt,
    jobMatches: (r.jobMatches ?? []).map((m) => ({
      id: m.id,
      jobName: m.jobName,
      location: m.location,
      time: m.time,
      workDays: m.workDays ?? [],
      description: m.description ?? "",
      matchedAt: typeof m.matchedAt === "string" ? m.matchedAt : new Date(m.matchedAt).toISOString(),
    })),
  };
}

/** 평가 목록에서 매칭된 일자리만 골라서 평탄화 (판단 기록은 목록에 안 넣음) */
function flattenMatchedJobs(assessments: AssessmentRecordResponse[]): MatchedJobItem[] {
  const items: MatchedJobItem[] = [];
  for (const a of assessments) {
    const aid = String(a.id);
    for (const m of a.jobMatches ?? []) {
      items.push({
        ...m,
        assessmentId: aid,
        applicantName: a.applicantName,
        assessedAt: a.assessedAt,
      });
    }
  }
  return items;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function JobListScreen() {
  const [matchedJobs, setMatchedJobs] = useState<MatchedJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getApiBaseUrl().then(setServerUrl);
  }, []);

  const loadRecords = useCallback(async () => {
    setLoadError(false);
    setErrorMessage("");
    try {
      const list = await fetchAssessmentRecords();
      const mapped = list.map(mapApiToRiskRecord);
      await setRecords(mapped);
      setMatchedJobs(flattenMatchedJobs(list));
    } catch (e) {
      const stored = await getRecords();
      const fromStored = stored.flatMap((r) =>
        (r.jobMatches ?? []).map((m) => ({
          ...m,
          assessmentId: r.id,
          applicantName: "",
          assessedAt: r.timestamp,
        }))
      );
      setMatchedJobs(fromStored);
      setLoadError(true);
      const msg = e instanceof Error ? e.message : String(e);
      const isNetworkFail =
        msg.includes("Network request failed") ||
        msg.includes("abort") ||
        (e instanceof Error && e.name === "AbortError");
      setErrorMessage(
        msg === "API 404"
          ? "경로 없음 (404)"
          : isNetworkFail
            ? "연결 실패 (실기기면 맥 IP 입력 후 저장)"
            : msg
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    loadRecords();
  }, [loadRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecords();
  }, [loadRecords]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.push("/guide")} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={20} />
          </Pressable>
          <Text style={styles.headerTitle}>최근 매칭 기록</Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>서버에서 불러오는 중...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      scrollViewProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />,
      }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/guide")} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>최근 매칭 기록</Text>
      </View>

      {loadError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>서버에 연결할 수 없습니다.</Text>
          {errorMessage ? <Text style={styles.errorDetail}>{errorMessage}</Text> : null}
          <Text style={styles.errorHint}>
            실기기(휴대폰)에서는 아래에 <Text style={styles.errorBold}>맥 IP</Text>를 입력해야 합니다.
          </Text>
          <Text style={styles.errorStep}>1) 맥 터미널에서: ipconfig getifaddr en0</Text>
          <Text style={styles.errorStep}>2) 나온 숫자(예: 192.168.0.5)로 http://숫자:8080 입력</Text>
          <Text style={styles.errorStep}>3) 맥에서 Spring 실행 중인지 확인 (./gradlew bootRun)</Text>
          <Text style={styles.errorStep}>※ 시뮬레이터만 쓰면 http://localhost:8080 으로 두고 Spring만 켜면 됨</Text>
          <Text style={styles.urlLabel}>서버 주소</Text>
          <TextInput
            style={styles.urlInput}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.0.5:8080"
            placeholderTextColor={colors.mutedText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={styles.retryButton}
            onPress={async () => {
              const trimmed = serverUrl.trim();
              if (!trimmed) {
                Toast.show({ type: "info", text1: "서버 주소를 입력하세요." });
                return;
              }
              await setApiBaseUrl(trimmed);
              const saved = await getApiBaseUrl();
              setServerUrl(saved);
              setLoading(true);
              setLoadError(false);
              setErrorMessage("");
              await loadRecords();
            }}
          >
            <Text style={styles.retryButtonText}>저장 후 재연결</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.list}>
        {matchedJobs.length === 0 && !loading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {loadError
                ? "웹에서 결과 전송 후 당겨서 새로고침 해주세요."
                : "매칭된 일자리가 없습니다."}
            </Text>
          </View>
        )}
        {matchedJobs.map((item) => (
          <Pressable
            key={`${item.assessmentId}-${item.id}`}
            onPress={() => router.push(`/records/${item.assessmentId}`)}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card style={styles.card}>
              <View style={styles.listHeader}>
                <Text style={styles.jobTitle}>{item.jobName}</Text>
                <ChevronRight color={colors.mutedText} size={18} />
              </View>
              <View style={styles.listGrid}>
                {item.location ? <InfoLine label="근무지" value={item.location} /> : null}
                {item.time ? <InfoLine label="시간" value={item.time} /> : null}
                {(item.workDays?.length ?? 0) > 0 ? (
                  <InfoLine label="요일" value={item.workDays!.join(", ")} />
                ) : null}
              </View>
              <Text style={styles.dateText}>
                {item.applicantName ? `${item.applicantName}님 배치 · ` : ""}
                {format(new Date(item.assessedAt), "yyyy년 MM월 dd일", { locale: ko })}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>
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
  list: {
    gap: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  card: {
    gap: 12,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  listGrid: {
    gap: 6,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.mutedText,
    minWidth: 72,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: colors.mutedText,
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.mutedText,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    textAlign: "center",
    fontWeight: "600",
  },
  errorDetail: {
    fontSize: 11,
    color: "#B91C1C",
    textAlign: "center",
  },
  errorHint: {
    fontSize: 12,
    color: "#B91C1C",
    textAlign: "center",
  },
  errorBold: {
    fontWeight: "700",
  },
  errorStep: {
    fontSize: 11,
    color: "#92400E",
    textAlign: "left",
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginTop: 4,
  },
  urlInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: "center",
  },
});
