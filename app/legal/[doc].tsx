// app/legal/[doc].tsx
//
// Single dynamic screen that renders Terms, Privacy, Responsible Gaming and
// Support copy. Content lives inline today — when product/legal hands us the
// finalised long-form text we swap each doc body with the real markdown or
// remote-fetched HTML.
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/fonts';
import { rs } from '@/utils/responsive';

type DocKey = 'terms' | 'privacy' | 'responsible-gaming' | 'support';

type Section = { heading: string; body: string };

type Doc = {
  title: string;
  updated: string;
  intro?: string;
  sections: Section[];
};

const DOCS: Record<DocKey, Doc> = {
  terms: {
    title: 'Terms & Conditions',
    updated: 'Last updated: May 2026',
    intro:
      'These Terms & Conditions ("Terms") form a binding legal agreement between you ("you", "the user") and Wahala ("Wahala", "we", "us", "our") and govern your access to and use of the Wahala mobile application, website and any related services (together, the "Platform"). By creating an account, depositing funds, placing a bet or otherwise using the Platform you confirm that you have read, understood and agreed to these Terms. If you do not agree, you must stop using the Platform immediately.',
    sections: [
      {
        heading: '1. Eligibility & verification',
        body:
          'To use Wahala you must (a) be at least 18 years of age, (b) be a legal resident of the Federal Republic of Nigeria, (c) have full legal capacity to enter into a binding contract under Nigerian law, and (d) not be self-excluded from gambling on Wahala or via any national self-exclusion register. You agree to provide accurate, current and complete information during registration and to keep it up to date. We may, at any time and at our sole discretion, request Know-Your-Customer ("KYC") documentation — including a valid government-issued ID, BVN, NIN, proof of address and a selfie — to verify your identity, age, source of funds and the ownership of any linked bank account. We may suspend or close accounts and withhold balances pending or following verification, as required by the National Lottery Regulatory Commission (NLRC), the Nigerian Financial Intelligence Unit (NFIU), the Central Bank of Nigeria (CBN) and applicable anti-money-laundering laws.',
      },
      {
        heading: '2. Your account',
        body:
          'You may only hold one Wahala account. Accounts are personal, non-transferable and may not be sold, gifted, shared or used on behalf of any third party. You are solely responsible for keeping your phone number, PIN, biometric credentials and device secure. Any activity carried out from an authenticated session is conclusively deemed to be your activity, and you accept full responsibility for it. You must notify support@wahala.bet without undue delay if you suspect unauthorised access, SIM-swap, device loss or any compromise of your credentials. We may freeze an account while we investigate any suspected compromise, fraud, duplicate registration or breach of these Terms.',
      },
      {
        heading: '3. Markets, bets & odds',
        body:
          'Wahala offers peer-to-peer and house-supplied prediction markets on real-world events. Each market displays a question, a resolution source, a closing time and a settlement window. Odds, prices and available liquidity are dynamic and may change at any moment up to the point a bet is accepted. A bet is only formed once it has been accepted by our system and a confirmation is shown in-app; an order that is displayed but not confirmed creates no obligation on us. Once accepted, every bet is final, irrevocable and binding — you cannot cancel, edit or "cash out" unless an explicit cash-out option is offered for that specific market.',
      },
      {
        heading: '4. Market resolution & disputes',
        body:
          'Each market is resolved according to the resolution criteria and data source published on its market page. Where the published source is unavailable, ambiguous, contradicted by clear public evidence, or where the underlying event is cancelled, postponed beyond the resolution window or materially altered, Wahala may, acting reasonably and in good faith, (a) resolve the market using the best available alternative source, (b) void the market and refund stakes, or (c) extend the resolution window. Wahala\'s resolution decision is final and binding, subject only to the dispute process. To raise a dispute you must contact support within 72 hours of settlement with the market link, your account ID and a clear written explanation; disputes raised outside this window will not be considered. Obvious errors in odds, prices, stakes or settlement (including pricing or typographical mistakes) may be corrected and any related bets voided at our sole discretion.',
      },
      {
        heading: '5. Wallet, deposits & withdrawals',
        body:
          'Your Wahala wallet is a record of funds available for betting and is not a bank account; balances do not earn interest and are not deposit-insured. Deposits are accepted in Nigerian Naira (NGN) through the payment channels shown in-app and are credited once the payment provider confirms settlement. Withdrawals are paid only to a bank account in your own verified name and are typically processed within 24 hours of request, subject to KYC, anti-fraud and source-of-funds checks. Minimum and maximum deposit and withdrawal limits, daily caps and applicable fees are displayed in-app and may change from time to time. We may reverse, hold or recover funds credited in error, obtained through fraud, or arising from a system bug, voided bet or chargeback.',
      },
      {
        heading: '6. Fees, taxes & promotions',
        body:
          'We may charge a commission, spread or platform fee on winning bets, deposits or withdrawals; the applicable fee is shown before you confirm the transaction. You are solely responsible for any personal income tax, withholding tax or other taxes that may apply to your winnings under Nigerian law. Bonuses, free bets, referral rewards and other promotions are subject to the specific promotional terms attached to them; abuse, multi-accounting or bonus arbitrage will result in forfeiture of the bonus and any related winnings.',
      },
      {
        heading: '7. Prohibited conduct',
        body:
          'You agree not to (a) create more than one account or use another person\'s identity, BVN, NIN or bank account; (b) use the Platform if you are under 18 or located outside Nigeria; (c) engage in collusion, match-fixing, insider betting, wash trading or any form of market manipulation; (d) use bots, scrapers, scripts, automated systems, emulators, rooted or jailbroken devices, or exploit any bug, latency, pricing error or unintended behaviour; (e) launder money, finance terrorism or use funds derived from criminal activity; (f) reverse-engineer, decompile or otherwise tamper with the Platform; or (g) abuse, threaten or harass our staff or other users. We may, without prior notice, suspend or terminate your account, void affected bets, withhold balances and report you to the relevant authorities for any breach of this clause.',
      },
      {
        heading: '8. Inactive accounts',
        body:
          'An account is considered inactive if there has been no login, deposit, withdrawal or bet for 12 consecutive months. We will attempt to contact you before applying any inactivity fee or, where required by law, transferring the balance to the relevant regulatory authority. You can reactivate an inactive account at any time by logging in and completing KYC.',
      },
      {
        heading: '9. Intellectual property',
        body:
          'The Platform, including its software, design, brand, content, market data and trademarks, is owned by or licensed to Wahala and is protected by Nigerian and international intellectual-property laws. We grant you a limited, personal, revocable, non-exclusive, non-transferable licence to use the app on a compatible device strictly for your own non-commercial use. All other rights are reserved.',
      },
      {
        heading: '10. Disclaimers & limitation of liability',
        body:
          'Betting involves financial risk and you may lose all of the money you stake. The Platform is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for purpose, accuracy or uninterrupted service. To the maximum extent permitted by Nigerian law, Wahala, its directors, employees, agents and affiliates will not be liable for any indirect, incidental, special, consequential or punitive loss, including loss of profits, loss of opportunity, loss of data or loss of goodwill, arising from your use of the Platform. Our total aggregate liability to you for any claim arising out of or relating to these Terms is limited to the lesser of (a) the net amount you have deposited into your wallet in the 6 months immediately preceding the claim, or (b) ₦500,000.',
      },
      {
        heading: '11. Indemnity',
        body:
          'You agree to indemnify and hold harmless Wahala and its officers, employees and partners from any claim, loss, liability, cost or expense (including reasonable legal fees) arising out of your breach of these Terms, your misuse of the Platform, or your violation of any law or third-party right.',
      },
      {
        heading: '12. Suspension & termination',
        body:
          'You may close your account at any time from the Profile screen or by emailing support@wahala.bet. We may, at our sole discretion and without prior notice, suspend, restrict or terminate your account, or refuse a bet, deposit or withdrawal, where we reasonably believe you have breached these Terms, where required by law or regulation, or where continuing the relationship presents an unacceptable legal, regulatory or fraud risk. On termination, any verified, lawfully-earned balance will be returned to your verified bank account, less any amounts we are required to withhold.',
      },
      {
        heading: '13. Governing law & dispute resolution',
        body:
          'These Terms are governed by, and shall be construed in accordance with, the laws of the Federal Republic of Nigeria. Any dispute, controversy or claim arising out of or in connection with these Terms shall first be referred to good-faith negotiation between you and our support team. If unresolved within 30 days, the dispute shall be finally settled by arbitration in Lagos, Nigeria, under the Arbitration and Mediation Act 2023, by a single arbitrator appointed in accordance with that Act. Nothing in this clause prevents either party from seeking urgent interim relief from a competent Nigerian court.',
      },
      {
        heading: '14. Changes to these Terms',
        body:
          'We may amend these Terms from time to time to reflect product, legal or regulatory changes. The current version is always available in-app under Legal. Where a change is material we will notify you by in-app notice, push notification or SMS at least 7 days before it takes effect. Your continued use of the Platform after the effective date constitutes acceptance of the revised Terms; if you do not agree, you must stop using the Platform and close your account.',
      },
      {
        heading: '15. Contact',
        body:
          'Questions about these Terms can be sent to legal@wahala.bet. For account-specific issues use the Help & Support section in-app.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: May 2026',
    intro:
      'Wahala ("we", "us", "our") is the data controller of the personal data you provide when using the Wahala app and services. This Privacy Policy explains what personal data we collect, why we collect it, how we use, share, store and protect it, and the rights you have over it under the Nigeria Data Protection Act 2023 ("NDPA"), the Nigeria Data Protection Regulation 2019 ("NDPR") and other applicable laws.',
    sections: [
      {
        heading: '1. Who we are',
        body:
          'Wahala is operated by Wahala Technologies Limited, a company incorporated in Nigeria. For the purposes of the NDPA we act as the data controller of your personal data. You can reach our Data Protection Officer at dpo@wahala.bet.',
      },
      {
        heading: '2. Personal data we collect',
        body:
          'We collect: (a) Identity data — full name, date of birth, gender, BVN, NIN, photograph, government-ID images, selfie-liveness video; (b) Contact data — phone number, email address, residential address; (c) Account data — Wahala username, hashed PIN, security questions, KYC status; (d) Financial data — wallet balance, deposit and withdrawal history, bank account details, card-token references (we never store full card numbers — these are tokenised by our PCI-DSS-compliant payment partners); (e) Activity data — markets viewed, bets placed, stakes, odds, win/loss history, leaderboard position, comments and reactions; (f) Technical data — device model, OS version, app version, IP address, network carrier, advertising identifier (where you have consented), crash logs and diagnostic events; (g) Communications data — messages you send to support and our replies; (h) Marketing preferences — your choices about push, email and SMS marketing.',
      },
      {
        heading: '3. How we collect it',
        body:
          'We collect data (a) directly from you when you register, complete KYC, deposit, place a bet, post a comment or contact support; (b) automatically from your device when you use the app, via cookies and similar SDKs on the web version, and via analytics and crash-reporting tools; and (c) from third parties such as identity-verification providers (e.g. NIBSS for BVN, NIMC for NIN), payment processors, sanctions and PEP databases, our fraud-prevention partners and publicly available sources.',
      },
      {
        heading: '4. Why we use your data & legal bases',
        body:
          'Under the NDPA we may only process your personal data where we have a lawful basis. We use your data to: (a) create and operate your account, accept bets and pay winnings — performance of our contract with you; (b) verify your identity, prevent fraud, comply with AML/CFT obligations and respond to lawful requests from regulators, courts and law-enforcement — legal obligation and legitimate interests; (c) keep the Platform secure, debug and improve it — legitimate interests; (d) send transactional notifications (deposit confirmed, market resolved, withdrawal paid) — performance of contract; (e) send marketing messages and personalised offers — your consent, which you can withdraw at any time; (f) operate the public leaderboard and social features — your consent (you can opt out from Profile).',
      },
      {
        heading: '5. Who we share it with',
        body:
          'We share personal data only with parties who need it and only for the purposes above: (a) identity-verification and KYC providers; (b) payment processors, banks and switching networks (e.g. Paystack, Flutterwave, NIBSS); (c) cloud-hosting and infrastructure providers; (d) analytics, crash-reporting and customer-support tools; (e) professional advisors such as lawyers, auditors and insurers; (f) regulators, courts, the NLRC, NFIU, EFCC, NDPC and other competent authorities where we are legally required to do so; and (g) any acquirer or successor in the event of a merger, sale or restructuring. We do not sell your personal data, and we do not share it with advertisers for cross-context behavioural advertising.',
      },
      {
        heading: '6. International transfers',
        body:
          'Some of our service providers process data outside Nigeria. Where we transfer personal data abroad we rely on the safeguards permitted under the NDPA — including transfers to jurisdictions recognised as providing adequate protection, standard contractual clauses, or your explicit consent — and we require all recipients to apply security standards no lower than those in this Policy.',
      },
      {
        heading: '7. How long we keep it',
        body:
          'We retain personal data only for as long as necessary for the purpose for which it was collected and to comply with our legal obligations. As a regulated operator we are typically required to retain KYC records, transaction history and betting activity for a minimum of 7 years after account closure. Marketing preferences and consent logs are retained for as long as you remain a user. Diagnostic and crash data is retained for up to 90 days. After the applicable retention period we securely delete or irreversibly anonymise the data.',
      },
      {
        heading: '8. How we protect it',
        body:
          'We apply technical and organisational measures appropriate to the risk, including TLS encryption in transit, encryption at rest for sensitive fields, hashed PINs, secure key management, biometric and PIN-based device authentication, role-based access control, audit logging, vulnerability scanning, regular penetration testing and staff training. No system is perfectly secure; if a personal-data breach occurs that is likely to result in a risk to your rights we will notify the NDPC and affected users without undue delay in line with the NDPA.',
      },
      {
        heading: '9. Your rights',
        body:
          'Subject to the conditions in the NDPA, you have the right to: (a) be informed about how we process your data; (b) access a copy of your personal data; (c) request correction of inaccurate or incomplete data; (d) request deletion of your data ("right to erasure") where we no longer need it and no legal obligation requires us to keep it; (e) request restriction of processing; (f) object to processing based on legitimate interests or for direct marketing; (g) data portability — receive your data in a structured, commonly used, machine-readable format; (h) withdraw consent at any time where processing is based on consent; and (i) lodge a complaint with the Nigeria Data Protection Commission (NDPC) at ndpc.gov.ng. To exercise any of these rights, email dpo@wahala.bet from your registered address — we will respond within 30 days.',
      },
      {
        heading: '10. Children',
        body:
          'Wahala is strictly for adults. We do not knowingly collect personal data from anyone under 18. If we discover that a minor has registered we will close the account, delete the data and refund any net deposits to the source of payment.',
      },
      {
        heading: '11. Cookies & similar technologies',
        body:
          'On our website we use cookies and similar technologies for authentication, security, preferences and analytics. You can manage these in your browser at any time. The mobile app uses local storage and platform identifiers for the same purposes; you can reset your advertising identifier through your device settings.',
      },
      {
        heading: '12. Changes to this Policy',
        body:
          'We may update this Policy from time to time. The "last updated" date at the top will always reflect the latest version. Where changes are material we will notify you in-app or by SMS before they take effect.',
      },
      {
        heading: '13. Contact us',
        body:
          'For any privacy question or to exercise any right, contact our Data Protection Officer at dpo@wahala.bet. You may also write to: Data Protection Officer, Wahala Technologies Limited, Lagos, Nigeria.',
      },
    ],
  },
  'responsible-gaming': {
    title: 'Responsible Gaming',
    updated: 'Stay in control — bet for fun, not as income',
    intro:
      'At Wahala we want betting to remain a form of entertainment, never a source of harm. This Responsible Gaming policy explains the tools we provide to help you stay in control, the warning signs of problem gambling, and where to find confidential help if you or someone you know needs it.',
    sections: [
      {
        heading: '1. Our commitment',
        body:
          'Wahala is committed to providing a safe, fair and transparent betting environment in line with the National Lottery Regulatory Commission (NLRC) responsible-gambling guidelines. We train our staff to recognise the signs of problem gambling, we monitor accounts for at-risk behaviour, and we will proactively reach out, restrict, or close an account where we believe continued play is causing harm — even without a request from the user.',
      },
      {
        heading: '2. Play only if you are 18 or older',
        body:
          'Underage gambling is illegal in Nigeria and strictly prohibited on Wahala. We use age and identity verification to keep minors off the platform. Parents and guardians: please use device-level parental controls such as Apple Screen Time, Google Family Link or third-party tools like Net Nanny or Qustodio to prevent under-18s from installing or accessing gambling apps. If you suspect a minor is using Wahala, report it to support@wahala.bet immediately.',
      },
      {
        heading: '3. Healthy-play principles',
        body:
          'Treat betting as entertainment, not as a way to make money or recover debts. Decide how much you can comfortably lose before you start, and stop when you reach that limit. Never chase losses by increasing your stakes. Do not bet under the influence of alcohol or drugs, when stressed, depressed or unable to sleep. Balance betting with work, family, sport, faith and other interests, and take regular breaks from the app.',
      },
      {
        heading: '4. Tools to help you stay in control',
        body:
          'From the Profile → Responsible Gaming screen you can set: (a) Daily, weekly and monthly deposit limits — reductions take effect immediately, increases require a 24-hour cooling-off period; (b) Single-bet and daily stake limits; (c) Loss limits per day, week or month; (d) Session-time reminders that nudge you after 30, 60 or 90 minutes of continuous play; (e) Reality checks showing your net win/loss for the session; (f) A cooling-off period of 24 hours, 7 days or 30 days during which you cannot bet or deposit; (g) Self-exclusion for 6 months, 1 year, 5 years or permanently. Once self-exclusion is activated it cannot be reversed before the chosen period ends, and we will close any duplicate accounts we identify.',
      },
      {
        heading: '5. Warning signs',
        body:
          'Please pause and seek help if you notice any of the following: spending more time or money on betting than you intended; borrowing money, selling possessions or using money meant for bills or food to bet; lying to family or friends about your betting; feeling restless, irritable or anxious when not betting; chasing losses with bigger stakes; missing work, lectures, sleep or family commitments because of betting; feeling guilt, shame or hopelessness about your betting. Problem gambling is a recognised health condition — it is treatable, and asking for help is a sign of strength.',
      },
      {
        heading: '6. Self-assessment',
        body:
          'A quick self-check: In the past 12 months, have you bet more than you could really afford to lose? Have you needed to gamble with larger amounts to get the same feeling of excitement? Have you gone back another day to try to win back what you lost? Have you borrowed money or sold anything to get money to gamble? Has your gambling caused any financial problems for you or your household? If you answered "yes" to any of these, please consider using a cooling-off period and reaching out to one of the support services below.',
      },
      {
        heading: '7. Where to get confidential help in Nigeria',
        body:
          'You are not alone — qualified, confidential support is available: (a) Mentally Aware Nigeria Initiative (MANI) — 24/7 mental-health and addiction support: mentallyaware.org, WhatsApp 0809 210 6493; (b) Gamblers Anonymous Nigeria — peer support meetings, gamblersanonymous.org.ng; (c) The Nigerian Mental Health Helpline — 0809 210 6493 / 0708 053 8392; (d) Lagos State Lotteries and Gaming Authority (LSLGA) SafePlay — Nigeria\'s national self-exclusion register, which blocks you from all licensed operators in one step; (e) findahelpline.com/countries/ng/topics/gambling — directory of free, confidential helplines in Nigeria. In an emergency or if you are in danger, call 112.',
      },
      {
        heading: '8. Friends & family',
        body:
          'If you are worried about someone else\'s betting, you can encourage them to use the in-app tools, contact one of the helplines above, or — in cases of serious harm — send a written request to support@wahala.bet asking us to review the account. While we cannot share another adult\'s account information with you, we will investigate every credible third-party concern and act where the evidence supports it.',
      },
      {
        heading: '9. Marketing & advertising',
        body:
          'We do not target marketing at minors, self-excluded users, or users showing signs of harm. You can switch off betting-related push, email and SMS marketing at any time from Profile → Notifications.',
      },
      {
        heading: '10. Contact us',
        body:
          'To activate any limit, cooling-off or self-exclusion that is not yet available in-app, or to talk to a trained agent in confidence, email responsible-gaming@wahala.bet. We aim to respond within 4 hours during 8am–10pm WAT.',
      },
    ],
  },
  support: {
    title: 'Help & Support',
    updated: 'We typically reply within a few hours',
    intro:
      'Got a question, a stuck deposit, or a market dispute? We are here to help.',
    sections: [
      {
        heading: 'Email',
        body: 'support@wahala.bet',
      },
      {
        heading: 'WhatsApp',
        body: 'Coming soon — for now please reach us by email.',
      },
      {
        heading: 'Common issues',
        body:
          'Deposits usually confirm in under 2 minutes. Withdrawals can take up to 24 hours. For market resolution disputes, message support with the market link and your reasoning.',
      },
    ],
  },
};

export default function LegalDocScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc?: string }>();

  const content = useMemo<Doc | null>(() => {
    if (!doc) return null;
    return DOCS[doc as DocKey] ?? null;
  }, [doc]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [
            styles.backBtn,
            pressed && { opacity: 0.6 },
          ]}
          hitSlop={rs.size(8)}
        >
          <Feather name="chevron-left" size={rs.font(22)} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {content?.title ?? 'Legal'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {content ? (
          <>
            <Text style={styles.updated}>{content.updated}</Text>
            {content.intro ? <Text style={styles.intro}>{content.intro}</Text> : null}
            {content.sections.map((s) => (
              <View key={s.heading} style={styles.section}>
                <Text style={styles.sectionHeading}>{s.heading}</Text>
                <Text style={styles.sectionBody}>{s.body}</Text>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.notFound}>
            <Feather name="file-text" size={rs.font(32)} color="#444444" />
            <Text style={styles.notFoundTitle}>Document not found</Text>
            <Text style={styles.notFoundHint}>
              The page you&apos;re looking for doesn&apos;t exist.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs.size(16),
    paddingVertical: rs.size(12),
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
  },
  backBtn: {
    width: rs.size(36),
    height: rs.size(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    fontSize: rs.font(16),
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: rs.size(20),
    paddingTop: rs.size(20),
    paddingBottom: rs.size(48),
  },
  updated: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(12),
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  intro: {
    marginTop: rs.size(12),
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    lineHeight: rs.font(22),
    color: '#BBBBBB',
  },
  section: {
    marginTop: rs.size(24),
  },
  sectionHeading: {
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: '#FFFFFF',
  },
  sectionBody: {
    marginTop: rs.size(8),
    fontFamily: Fonts.regular,
    fontSize: rs.font(14),
    lineHeight: rs.font(22),
    color: '#999999',
  },
  notFound: {
    marginTop: rs.size(80),
    alignItems: 'center',
    gap: rs.size(8),
  },
  notFoundTitle: {
    marginTop: rs.size(8),
    fontFamily: Fonts.semibold,
    fontSize: rs.font(15),
    color: '#FFFFFF',
  },
  notFoundHint: {
    fontFamily: Fonts.regular,
    fontSize: rs.font(13),
    color: '#777777',
    textAlign: 'center',
  },
});
