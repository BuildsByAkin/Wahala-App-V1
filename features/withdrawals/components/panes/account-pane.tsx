// features/withdrawals/components/panes/account-pane.tsx
//
// Two sub-modes inside this pane: 'list' (saved accounts) and 'add' (search
// banks + enter 10-digit account number, debounced auto-resolve via POST
// /me/bank-accounts). nameMatchScore < 0.6 surfaces a warning but doesn't
// block — final decision is the user's.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';
import type {
  Bank,
  BankAccount,
} from '@/features/withdrawals/api/withdrawals-api';
import {
  useAddBankAccount,
  useBankAccounts,
} from '@/features/withdrawals/hooks/use-bank-accounts';
import { useBanks } from '@/features/withdrawals/hooks/use-banks';
import { extractWithdrawalError } from '@/features/withdrawals/hooks/use-withdrawals';
import { sheetStyles, ACCENT } from '../sheet-styles';

type Props = {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCancel: () => void;
};

type Mode = 'list' | 'add';

export function AccountPane({ selectedId, onSelect, onCancel }: Props) {
  const accountsQuery = useBankAccounts();
  const [mode, setMode] = useState<Mode>('list');

  // Auto-jump to add mode if there are no saved accounts.
  useEffect(() => {
    if (accountsQuery.data && accountsQuery.data.length === 0) {
      setMode('add');
    }
  }, [accountsQuery.data]);

  return (
    <>
      <View style={sheetStyles.headerRow}>
        <View style={sheetStyles.dot} />
        <Text style={sheetStyles.eyebrow}>DESTINATION</Text>
      </View>
      <Text style={sheetStyles.title}>
        {mode === 'list' ? 'Choose account' : 'Add bank account'}
      </Text>

      {mode === 'list' ? (
        <ListMode
          accounts={accountsQuery.data ?? []}
          isLoading={accountsQuery.isLoading}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddNew={() => setMode('add')}
          onBack={onCancel}
        />
      ) : (
        <AddMode
          onSaved={(id) => {
            onSelect(id);
          }}
          onBackToList={() =>
            (accountsQuery.data?.length ?? 0) > 0
              ? setMode('list')
              : onCancel()
          }
        />
      )}
    </>
  );
}

// ── List mode ──────────────────────────────────────────────────────────────
function ListMode({
  accounts,
  isLoading,
  selectedId,
  onSelect,
  onAddNew,
  onBack,
}: {
  accounts: BankAccount[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
  onBack: () => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#888" />
      </View>
    );
  }
  return (
    <View>
      <ScrollView style={styles.listScroll}>
        {accounts.map((a) => {
          const isSelected = a.id === selectedId;
          return (
            <Pressable
              key={a.id}
              onPress={() => onSelect(a.id)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${a.bankName} account ending ${a.accountNumber.slice(-4)}`}
              style={({ pressed }) => [
                styles.accountRow,
                isSelected && styles.accountRowSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{a.accountName}</Text>
                <Text style={styles.accountMeta}>
                  {a.bankName} •••• {a.accountNumber.slice(-4)}
                  {a.isDefault ? '  · Default' : ''}
                </Text>
              </View>
              {isSelected ? (
                <Feather name="check-circle" size={rs.font(20)} color={ACCENT} />
              ) : (
                <Feather name="circle" size={rs.font(20)} color="#333" />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={onAddNew}
        accessibilityRole="button"
        accessibilityLabel="Add a new bank account"
        style={({ pressed }) => [
          sheetStyles.ghostBtn,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={sheetStyles.ghostBtnText}>+ Add another account</Text>
      </Pressable>

      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backLinkRow}
      >
        <Feather name="chevron-left" size={rs.font(14)} color="#888" />
        <Text style={styles.backLinkText}>Back</Text>
      </Pressable>
    </View>
  );
}

// ── Add mode ───────────────────────────────────────────────────────────────
function AddMode({
  onSaved,
  onBackToList,
}: {
  onSaved: (id: string) => void;
  onBackToList: () => void;
}) {
  const banksQuery = useBanks();
  const addMutation = useAddBankAccount();

  const [bankSearch, setBankSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [acctNumber, setAcctNumber] = useState('');
  const [resolved, setResolved] = useState<{
    accountName: string;
    nameMatchScore: number;
    bankAccountId: string;
  } | null>(null);

  const filteredBanks = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    const list = banksQuery.data ?? [];
    if (!q) return list.slice(0, 50);
    return list
      .filter((b) => b.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [bankSearch, banksQuery.data]);

  // Debounced auto-resolve at exactly 10 digits.
  useEffect(() => {
    if (!selectedBank) return;
    if (acctNumber.length !== 10) {
      setResolved(null);
      return;
    }
    const handle = setTimeout(() => {
      addMutation.reset();
      addMutation.mutate(
        {
          bankCode: selectedBank.code,
          accountNumber: acctNumber,
        },
        {
          onSuccess: (res) => {
            setResolved({
              accountName: res.accountName,
              nameMatchScore: res.nameMatchScore,
              bankAccountId: res.bankAccountId,
            });
          },
        }
      );
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acctNumber, selectedBank?.code]);

  const handleConfirm = () => {
    if (resolved) onSaved(resolved.bankAccountId);
  };

  const apiError = addMutation.error
    ? extractWithdrawalError(addMutation.error)
    : null;

  return (
    <View>
      {!selectedBank ? (
        <>
          <View style={styles.searchBox}>
            <Feather name="search" size={rs.font(16)} color="#666" />
            <TextInput
              value={bankSearch}
              onChangeText={setBankSearch}
              placeholder="Search bank"
              placeholderTextColor="#444"
              style={styles.searchInput}
              autoFocus
              accessibilityLabel="Search for a bank"
            />
          </View>
          <ScrollView
            style={styles.bankListScroll}
            keyboardShouldPersistTaps="handled"
          >
            {banksQuery.isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#888" />
              </View>
            ) : (
              filteredBanks.map((b) => (
                <Pressable
                  key={b.code}
                  onPress={() => setSelectedBank(b)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${b.name}`}
                  style={({ pressed }) => [
                    styles.bankRow,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.bankRowText}>{b.name}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <>
          <Pressable
            onPress={() => {
              setSelectedBank(null);
              setAcctNumber('');
              setResolved(null);
              addMutation.reset();
            }}
            accessibilityRole="button"
            accessibilityLabel="Change bank"
            style={styles.selectedBankRow}
          >
            <Text style={styles.selectedBankLabel}>
              {selectedBank.name}
            </Text>
            <Text style={styles.changeLink}>Change</Text>
          </Pressable>

          <View style={styles.acctInputBlock}>
            <TextInput
              value={acctNumber}
              onChangeText={(t) =>
                setAcctNumber(t.replace(/\D/g, '').slice(0, 10))
              }
              placeholder="10-digit account number"
              placeholderTextColor="#444"
              keyboardType="number-pad"
              maxLength={10}
              style={styles.acctInput}
              accessibilityLabel="Bank account number"
              autoFocus
            />
          </View>

          {addMutation.isPending ? (
            <View style={styles.resolveRow}>
              <ActivityIndicator color="#888" />
              <Text style={styles.resolveMuted}>Resolving account…</Text>
            </View>
          ) : resolved ? (
            <View style={styles.resolveRow}>
              <Feather
                name="check-circle"
                size={rs.font(16)}
                color="#5BD37A"
              />
              <Text style={styles.resolveName}>{resolved.accountName}</Text>
            </View>
          ) : null}

          {resolved && resolved.nameMatchScore < 0.6 ? (
            <View style={styles.warnBox}>
              <Feather
                name="alert-triangle"
                size={rs.font(14)}
                color="#FFB561"
              />
              <Text style={styles.warnText}>
                The account name doesn&apos;t closely match your profile.
                Double-check before continuing.
              </Text>
            </View>
          ) : null}

          {apiError ? (
            <View style={sheetStyles.errorBox}>
              <Feather
                name="alert-circle"
                size={rs.font(14)}
                color="#FF5A5A"
              />
              <Text style={sheetStyles.errorText}>{apiError}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleConfirm}
            disabled={!resolved}
            accessibilityRole="button"
            accessibilityLabel="Use this account"
            style={({ pressed }) => [
              sheetStyles.submit,
              { opacity: !resolved ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={sheetStyles.submitText}>Use this account</Text>
          </Pressable>
        </>
      )}

      <Pressable
        onPress={onBackToList}
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.backLinkRow}
      >
        <Feather name="chevron-left" size={rs.font(14)} color="#888" />
        <Text style={styles.backLinkText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: rs.size(28), alignItems: 'center' },
  listScroll: {
    marginTop: rs.size(16),
    maxHeight: rs.size(280),
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs.size(14),
    paddingHorizontal: rs.size(14),
    borderRadius: rs.size(14),
    backgroundColor: '#181818',
    marginBottom: rs.size(8),
    gap: rs.size(10),
  },
  accountRowSelected: {
    borderWidth: 1,
    borderColor: ACCENT,
  },
  accountName: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(14),
    color: '#FFFFFF',
  },
  accountMeta: {
    marginTop: rs.size(2),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#888888',
  },
  backLinkRow: {
    marginTop: rs.size(14),
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: rs.size(2),
  },
  backLinkText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: '#888888',
  },
  searchBox: {
    marginTop: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(12),
    borderRadius: rs.size(14),
    backgroundColor: '#181818',
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    color: '#FFFFFF',
    padding: 0,
  },
  bankListScroll: {
    marginTop: rs.size(8),
    maxHeight: rs.size(240),
  },
  bankRow: {
    paddingVertical: rs.size(12),
    paddingHorizontal: rs.size(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F1F1F',
  },
  bankRowText: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(13),
    color: '#DDDDDD',
  },
  selectedBankRow: {
    marginTop: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rs.size(12),
    paddingHorizontal: rs.size(14),
    borderRadius: rs.size(14),
    backgroundColor: '#181818',
  },
  selectedBankLabel: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  changeLink: {
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: ACCENT,
  },
  acctInputBlock: {
    marginTop: rs.size(10),
    paddingHorizontal: rs.size(16),
    paddingVertical: rs.size(14),
    backgroundColor: '#181818',
    borderRadius: rs.size(14),
  },
  acctInput: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(18),
    color: '#FFFFFF',
    padding: 0,
    letterSpacing: 2,
  },
  resolveRow: {
    marginTop: rs.size(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  resolveMuted: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#888',
  },
  resolveName: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#FFFFFF',
  },
  warnBox: {
    marginTop: rs.size(10),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs.size(8),
    padding: rs.size(12),
    backgroundColor: '#1A1208',
    borderRadius: rs.size(12),
  },
  warnText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#FFB561',
    lineHeight: rs.font(17),
  },
});
