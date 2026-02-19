import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { router, useLocalSearchParams } from "expo-router";

import { colors } from "@/theme/colors";
import { Card } from "@/ui/Card";
import { PrimaryButton } from "@/ui/PrimaryButton";
import { Screen } from "@/ui/Screen";
import { getRecords } from "@/shared/storage/riskStorage";
import type { RiskRecord } from "@/shared/types/risk";

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<RiskRecord | null>(null);

  useEffect(() => {
    const loadRecord = async () => {
      const records = await getRecords();
      const found = records.find((item) => item.id === id);
      if (!found) {
        router.replace("/job-list");
        return;
      }
      setRecord(found);
    };

    loadRecord();
  }, [id]);

  if (!record) {
    return <Screen />;
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable onPress={() => router.push("/job-list")} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>배치 결과 상세</Text>
      </View>

      <View style={styles.stack}>
        <Card style={styles.card}>
          <Text style={styles.dateText}>
            {format(new Date(record.timestamp), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>매칭된 일자리{record.jobMatches?.length ? ` (${record.jobMatches.length}건)` : ""}</Text>
          {record.jobMatches && record.jobMatches.length > 0 ? (
            record.jobMatches.map((m) => (
              <View key={m.id} style={styles.matchBlock}>
                <Text style={styles.matchJobName}>{m.jobName}</Text>
                <Text style={styles.matchMeta}>{m.location}</Text>
                <Text style={styles.matchMeta}>{m.time}</Text>
                {m.workDays?.length ? (
                  <Text style={styles.matchMeta}>요일: {m.workDays.join(", ")}</Text>
                ) : null}
                {m.description ? (
                  <Text style={styles.matchDesc}>{m.description}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.emptyMatchText}>매칭된 일자리가 없습니다.</Text>
          )}
        </Card>

        <PrimaryButton label="홈으로 돌아가기" onPress={() => router.replace("/home")} />
      </View>
    </Screen>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

function DetailRow({ label, value, isLast = false }: DetailRowProps) {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailDivider]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  stack: {
    gap: 20,
  },
  card: {
    gap: 12,
  },
  dateText: {
    fontSize: 12,
    color: colors.mutedText,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.mutedText,
    fontSize: 13,
  },
  detailValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  matchBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  matchJobName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  matchMeta: {
    fontSize: 13,
    color: colors.mutedText,
  },
  matchDesc: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
  },
  emptyMatchText: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 8,
  },
});
