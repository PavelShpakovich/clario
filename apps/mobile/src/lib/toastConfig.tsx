import { View, Text, StyleSheet } from 'react-native';
import type { ToastConfig } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/colors';

function ToastBase({
  text1,
  text2,
  icon,
  iconColor,
}: {
  text1?: string;
  text2?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.foreground,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={iconColor} style={styles.icon} />
      <View style={styles.textWrap}>
        {text1 ? (
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={3}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function SuccessToast({ text1, text2 }: { text1?: string; text2?: string }) {
  const colors = useColors();
  return (
    <ToastBase text1={text1} text2={text2} icon="checkmark-circle" iconColor={colors.success} />
  );
}

function ErrorToast({ text1, text2 }: { text1?: string; text2?: string }) {
  const colors = useColors();
  return <ToastBase text1={text1} text2={text2} icon="alert-circle" iconColor={colors.error} />;
}

function InfoToast({ text1, text2 }: { text1?: string; text2?: string }) {
  const colors = useColors();
  return (
    <ToastBase text1={text1} text2={text2} icon="information-circle" iconColor={colors.primary} />
  );
}

export const toastConfig: ToastConfig = {
  success: (props) => <SuccessToast text1={props.text1} text2={props.text2} />,
  error: (props) => <ErrorToast text1={props.text1} text2={props.text2} />,
  info: (props) => <InfoToast text1={props.text1} text2={props.text2} />,
};

const styles = StyleSheet.create({
  container: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    marginTop: 1,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
