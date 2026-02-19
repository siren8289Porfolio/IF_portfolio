import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowLeft, ChevronRight, Search } from "lucide-react-native";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { router } from "expo-router";

import { colors } from "@/theme/colors";
import { Card } from "@/ui/Card";
import { Screen } from "@/ui/Screen";
import { getRecords, setRecords } from "@/shared/storage/riskStorage";
import type { RiskRecord } from "@/shared/types/risk";
import { getRiskLevel } from "@/shared/utils/risk";
import { fetchAssessmentRecords, type AssessmentRecordResponse } from "@/shared/api/assessments";
import { getApiBaseUrl } from "@/shared/storage/apiConfigStorage";

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

export default function RecordListScreen() {
  const [records, setRecordsState] = useState<RiskRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastAttemptUrl, setLastAttemptUrl] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoadError(null);
    setLastAttemptUrl(null);
    try {
      const apiRecords = await fetchAssessmentRecords();
      const mapped: RiskRecord[] = apiRecords.map(mapApiToRiskRecord);
      await setRecords(mapped);
      setRecordsState(mapped);
    } catch (e) {
      const base = await getApiBaseUrl();
      setLastAttemptUrl(base);
      const stored = await getRecords();
      setRecordsState(stored);
      const msg = e instanceof Error ? e.message : String(e);
      const isAbort = msg.includes("abort") || e instanceof Error && e.name === "AbortError";
      setLoadError(
        msg.startsWith("API ")
          ? `서버 오류 (${msg})`
          : isAbort
            ? "서버에 연결할 수 없습니다. (시간 초과)"
            : "서버에 연결할 수 없습니다."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    return records.filter(
      (record) =>
        record.job.includes(searchTerm) || String(record.age).includes(searchTerm)
    );
  }, [records, searchTerm]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.push("/home")} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={20} />
          </Pressable>
          <Text style={styles.headerTitle}>최근 판단 기록</Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>목록을 불러오는 중...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      scrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        ),
      }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/home")} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>최근 판단 기록</Text>
      </View>

      {loadError && records.length > 0 ? (
        <Card style={styles.bannerCard}>
          <Text style={styles.errorHint}>
            서버와 동기화하지 못해 로컬 기록만 표시됩니다. 웹에서 추가한 목록을 보려면 서버 연결 설정을 확인하세요.
          </Text>
          <Pressable onPress={() => router.push("/server-url")}>
            <Text style={styles.emptyLink}>서버 연결 설정</Text>
          </Pressable>
        </Card>
      ) : null}

      <View style={styles.searchWrapper}>
        <Search color={colors.mutedText} size={18} />
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="직무 또는 연령으로 검색"
          placeholderTextColor={colors.mutedText}
          style={styles.searchInput}
        />
      </View>

      {loadError && filteredRecords.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>{loadError}</Text>
          {lastAttemptUrl ? (
            <Text style={styles.errorHint}>연결 시도 주소: {lastAttemptUrl}</Text>
          ) : null}
          <Text style={styles.errorHint}>
            실기기에서는 "서버 연결 설정"에서 맥 IP(예: http://192.168.0.5:8080)를 입력하세요. 시뮬레이터는 Spring이 켜져 있어야 합니다.
          </Text>
          <Pressable onPress={() => router.push("/server-url")} style={styles.retryButton}>
            <Text style={styles.emptyLink}>서버 연결 설정으로 이동</Text>
          </Pressable>
          <Pressable onPress={() => { setLoading(true); loadRecords(); }} style={styles.retryButton}>
            <Text style={styles.emptyLink}>다시 불러오기</Text>
          </Pressable>
        </Card>
      ) : filteredRecords.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>저장된 기록이 없습니다</Text>
          <Text style={styles.errorHint}>
            웹에서 평가·매칭 후 "결과 전송"을 누르면 서버에 저장됩니다. 이 화면을 당겨서 새로고침하면 목록에 표시됩니다.
          </Text>
          <Pressable onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.emptyLink}>지금 새로고침</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/applicant-form")}>
            <Text style={styles.emptyLink}>앱에서 새 판단 시작하기</Text>
          </Pressable>
        </Card>
      ) : (
        <View style={styles.list}>
          {filteredRecords.map((record) => {
            const riskLevel = getRiskLevel(record.riskScore);
            return (
              <Pressable
                key={record.id}
                onPress={() => router.push(`/records/${record.id}`)}
                style={({ pressed }: { pressed: boolean }) => [pressed && styles.pressed]}
              >
                <Card style={styles.listItem}>
                  <View style={styles.listHeader}>
                    <View style={styles.riskRow}>
                      <View
                        style={[
                          styles.riskScore,
                          { backgroundColor: riskLevel.backgroundColor },
                        ]}
                      >
                        <Text style={[styles.riskScoreText, { color: riskLevel.textColor }]}>
                          {record.riskScore}점
                        </Text>
                      </View>
                      <Text style={styles.riskLabel}>{riskLevel.level}</Text>
                    </View>
                    <ChevronRight color={colors.mutedText} size={18} />
                  </View>

                  <View style={styles.listGrid}>
                    <InfoLine label="연령 / 직무" value={`${record.age}세 / ${record.job}`} />
                    <InfoLine label="신체 기능" value={record.physicalLevel} />
                  </View>

                  <Text style={styles.dateText}>
                    {format(new Date(record.timestamp), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

type InfoLineProps = {
  label: string;
  value: string;
};

function InfoLine({ label, value }: InfoLineProps) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
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
  emptyCard: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  bannerCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  errorHint: {
    fontSize: 12,
    color: colors.mutedText,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 8,
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 14,
  },
  emptyLink: {
    color: colors.secondary,
    fontWeight: "600",
  },
  list: {
    gap: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  listItem: {
    gap: 12,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  riskScore: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  riskScoreText: {
    fontSize: 13,
    fontWeight: "700",
  },
  riskLabel: {
    fontSize: 12,
    color: colors.mutedText,
  },
  listGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoLine: {
    width: "47%",
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.mutedText,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  dateText: {
    fontSize: 12,
    color: colors.mutedText,
  },
});
