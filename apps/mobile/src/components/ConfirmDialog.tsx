import React, { createContext, useContext, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/lib/colors';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider');
  return ctx;
}

interface DialogState extends Required<
  Pick<ConfirmOptions, 'title' | 'confirmText' | 'cancelText' | 'destructive'>
> {
  description?: string;
}

const DEFAULT_STATE: DialogState = {
  title: '',
  description: undefined,
  confirmText: 'Подтвердить',
  cancelText: 'Отмена',
  destructive: false,
};

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<DialogState>(DEFAULT_STATE);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = (opts) =>
    new Promise((resolve) => {
      setState({
        title: opts.title,
        description: opts.description,
        confirmText: opts.confirmText ?? 'Подтвердить',
        cancelText: opts.cancelText ?? 'Отмена',
        destructive: opts.destructive ?? false,
      });
      resolveRef.current = resolve;
      setVisible(true);
    });

  function handleConfirm() {
    setVisible(false);
    resolveRef.current?.(true);
  }

  function handleCancel() {
    setVisible(false);
    resolveRef.current?.(false);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCancel}
      >
        <Pressable style={styles.overlay} onPress={handleCancel}>
          <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{state.title}</Text>
            {state.description ? <Text style={styles.description}>{state.description}</Text> : null}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>{state.cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, state.destructive && styles.destructiveButton]}
                onPress={handleConfirm}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmText, state.destructive && styles.destructiveText]}>
                  {state.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialog: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
  },
  description: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.muted,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.foreground,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  destructiveButton: {
    backgroundColor: colors.destructive,
  },
  destructiveText: {
    color: '#fff',
  },
});
