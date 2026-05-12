// data/placeholder.ts
export const CATEGORIES = ['All', 'BBNaija', 'Football', 'Politics', 'Music', 'Tech'];

export interface Outcome {
  label: string;
  tag?: string;
  percent: number;
  multiplier: number;
}

export interface Market {
  id: string;
  type: 'full' | 'compact';
  category: string;
  badges: string[];
  closesIn: string | null;
  closesLabel?: string;
  liveScore?: string;
  question: string;
  outcomes: Outcome[];
  poolAmount: string;
  commentCount: number;
  avatarColors: string[];
  extraAvatars: number;
  lastComment: {
    username: string;
    badge: string;
    text: string;
  } | null;
}

export const MARKETS: Market[] = [
  {
    id: '1',
    type: 'full',
    category: 'BBNAIJA',
    badges: ['TRENDING'],
    closesIn: '4h 22m',
    question: 'Who go comot for BBNaija this Sunday?',
    outcomes: [
      { label: 'Tunde', tag: 'MOST PICKED', percent: 62, multiplier: 1.6 },
      { label: 'James', tag: 'UNDERDOG', percent: 38, multiplier: 2.6 },
    ],
    poolAmount: '₦487,200',
    commentCount: 312,
    avatarColors: ['#E040FB', '#29B6F6', '#FF7043', '#66BB6A'],
    extraAvatars: 847,
    lastComment: {
      username: '@jollof_warrior',
      badge: 'Tunde · N5K',
      text: 'Tunde don dey carry last 3 weeks straight. Una still dey pick am? Make I rest',
    },
  },
  {
    id: '2',
    type: 'compact',
    category: 'FOOTBALL',
    badges: ['LIVE'],
    closesIn: null,
    liveScore: "67' · 1-1",
    question: 'Super Eagles go win Ghana tonight?',
    outcomes: [
      { label: 'Yes', percent: 71, multiplier: 1.4 },
      { label: 'No', percent: 29, multiplier: 3.4 },
    ],
    poolAmount: '₦1.8M',
    commentCount: 894,
    avatarColors: ['#66BB6A', '#AB47BC', '#29B6F6'],
    extraAvatars: 1200,
    lastComment: null,
  },
  {
    id: '3',
    type: 'compact',
    category: 'POLITICS',
    badges: [],
    closesIn: 'Friday',
    closesLabel: 'Closes Friday',
    question: 'Tinubu go sack any minister before June?',
    outcomes: [
      { label: 'Yes', percent: 44, multiplier: 2.3 },
      { label: 'No way', percent: 56, multiplier: 1.8 },
    ],
    poolAmount: '₦294K',
    commentCount: 201,
    avatarColors: ['#FF7043', '#FFA726'],
    extraAvatars: 423,
    lastComment: null,
  },
];
