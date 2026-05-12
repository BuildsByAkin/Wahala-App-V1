// utils/responsive.ts
import { Dimensions } from 'react-native';

const { width: deviceWidth, height: deviceHeight } = Dimensions.get('window');
const BASE_WIDTH = 375;

const scale = (size: number) => (deviceWidth / BASE_WIDTH) * size;
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const rs = {
  size: (n: number) => moderateScale(n),
  font: (n: number) => moderateScale(n, 0.4),
  width: deviceWidth,
  height: deviceHeight,
};
