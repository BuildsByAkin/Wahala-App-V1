// features/withdrawals/components/sheet-styles.ts
// Shared sheet chrome — backdrop, sheet container, handle, primary CTA. The
// withdrawal flow reuses these tokens across every pane so the visual rhythm
// is identical to the existing deposit-sheet.
import { StyleSheet } from 'react-native';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

export const ACCENT = '#FF6500';

export const sheetStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  kav: { width: '100%', justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: rs.size(28),
    borderTopRightRadius: rs.size(28),
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(10),
    paddingBottom: rs.size(28),
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: rs.size(40),
    height: rs.size(5),
    borderRadius: rs.size(3),
    backgroundColor: '#2A2A2A',
    marginBottom: rs.size(20),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
  },
  dot: {
    width: rs.size(8),
    height: rs.size(8),
    borderRadius: rs.size(4),
    backgroundColor: ACCENT,
  },
  eyebrow: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(11),
    color: '#666666',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: rs.size(8),
    fontFamily: Fonts.bold,
    fontSize: rs.font(22),
    color: '#FFFFFF',
    lineHeight: rs.font(28),
  },
  subtitle: {
    marginTop: rs.size(6),
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#888888',
    lineHeight: rs.font(19),
  },
  submit: {
    marginTop: rs.size(20),
    backgroundColor: ACCENT,
    paddingVertical: rs.size(16),
    borderRadius: rs.size(9999),
    alignItems: 'center',
  },
  submitText: {
    fontFamily: Fonts.bold,
    fontSize: rs.font(15),
    color: '#0A0A0A',
    letterSpacing: 0.3,
  },
  ghostBtn: {
    marginTop: rs.size(12),
    paddingVertical: rs.size(14),
    borderRadius: rs.size(9999),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222222',
  },
  ghostBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(13),
    color: '#DDDDDD',
  },
  errorBox: {
    marginTop: rs.size(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs.size(8),
    backgroundColor: '#1F0E0E',
    paddingHorizontal: rs.size(14),
    paddingVertical: rs.size(10),
    borderRadius: rs.size(12),
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: rs.font(12),
    color: '#FF8A8A',
  },
  legal: {
    marginTop: rs.size(12),
    fontFamily: Fonts.regular,
    fontSize: rs.font(11),
    color: '#555555',
    textAlign: 'center',
  },
  // Step indicator
  stepRow: {
    flexDirection: 'row',
    gap: rs.size(6),
    marginBottom: rs.size(14),
  },
  stepDot: {
    flex: 1,
    height: rs.size(3),
    borderRadius: rs.size(2),
    backgroundColor: '#1F1F1F',
  },
  stepDotActive: {
    backgroundColor: ACCENT,
  },
});
