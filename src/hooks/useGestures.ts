import { useEffect } from 'react';

import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  type WithSpringConfig,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
} as const satisfies WithSpringConfig;

interface SheetGestureParams {
  isOpen: boolean;
  sheetHeight: number;
  closedOffset?: number;
  onOpenChange: (next: boolean) => void;
  springConfig?: WithSpringConfig;
}

export const useSheetGesture = ({
  isOpen,
  sheetHeight,
  closedOffset = 0,
  onOpenChange,
  springConfig,
}: SheetGestureParams) => {
  const resolvedSpringConfig = springConfig ?? SPRING_CONFIG;
  const closedPosition = sheetHeight + closedOffset;
  const translateY = useSharedValue(isOpen ? 0 : closedPosition);

  useEffect(() => {
    translateY.value = withSpring(isOpen ? 0 : closedPosition, resolvedSpringConfig);
  }, [isOpen, closedPosition, translateY, resolvedSpringConfig]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const next = (isOpen ? 0 : closedPosition) + event.translationY;
      translateY.value = Math.max(0, Math.min(closedPosition, next));
    })
    .onEnd((event) => {
      const shouldClose = event.velocityY > 200 || translateY.value > closedPosition * 0.4;
      const target = shouldClose ? closedPosition : 0;
      translateY.value = withSpring(target, resolvedSpringConfig);
      runOnJS(onOpenChange)(!shouldClose);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return {
    panGesture,
    animatedStyle,
  };
};
