import type { ReactNode } from "react";
import type { ScrollViewProps } from "react-native";
import type { ViewStyle } from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";

type ScreenProps = {
  children?: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  backgroundColor?: string;
  scrollViewProps?: Partial<ScrollViewProps>;
};

export function Screen({
  children,
  scroll = false,
  contentStyle,
  backgroundColor,
  scrollViewProps,
}: ScreenProps) {
  const safeAreaStyle = [
    styles.safeArea,
    backgroundColor ? { backgroundColor } : null,
  ];

  if (scroll) {
    return (
      <SafeAreaView style={safeAreaStyle}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          {...scrollViewProps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={safeAreaStyle}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    padding: 20,
  },
});
