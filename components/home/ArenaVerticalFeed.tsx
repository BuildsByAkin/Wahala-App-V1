// components/home/ArenaVerticalFeed.tsx
// TikTok-style vertical pager. One full-screen ArenaFullCard per page.
// Built on FlashList with `pagingEnabled` so each swipe lands on the next
// market.
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';

import { ArenaFullCard } from '@/components/home/ArenaFullCard';
import { Colors } from '@/constants/colors';
import { type Market } from '@/utils/market';

interface ArenaVerticalFeedProps {
  markets: Market[];
  /** Page height — each card fills this exactly. */
  pageHeight: number;
}

export const ArenaVerticalFeed: React.FC<ArenaVerticalFeedProps> = ({
  markets,
  pageHeight,
}) => {
  const renderItem: ListRenderItem<Market> = useCallback(
    ({ item }) => <ArenaFullCard market={item} height={pageHeight} />,
    [pageHeight]
  );

  if (markets.length === 0) return null;

  return (
    <View style={[styles.host, { height: pageHeight }]}>
      <FlashList
        data={markets}
        renderItem={renderItem}
        keyExtractor={(m) => `arena-${m.id}`}
        pagingEnabled
        snapToInterval={pageHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    width: '100%',
    backgroundColor: Colors.surface['00'],
  },
});
