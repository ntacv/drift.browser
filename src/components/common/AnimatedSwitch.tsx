import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../../theme';

export const SWITCH_TRACK_WIDTH = 46;
export const SWITCH_TRACK_HEIGHT = 28;

const THUMB_SIZE = 22;
const TRACK_PADDING = 3;
const TRAVEL_DISTANCE = SWITCH_TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2;
const TRANSITION_DURATION = 180;

const TRACK_RADIUS = SWITCH_TRACK_HEIGHT / 2;

interface AnimatedSwitchProps {
    value: boolean;
}

/**
 * Purely presentational switch.
 *
 * The native `Switch` only animates when the platform widget performs the
 * transition itself; a value pushed from JS is applied with `setChecked()`,
 * which snaps the thumb straight to the new edge when the view is not in a
 * state to run the drawable transition. Driving the thumb with Reanimated
 * makes the transition deterministic, no matter where the change came from.
 *
 * Press handling and accessibility live on the parent row, so this view is
 * non-touchable.
 */
export const AnimatedSwitch = ({ value }: AnimatedSwitchProps) => {
    const { theme } = useTheme();

    const progress = useSharedValue(value ? 1 : 0);
    const isFirstRender = React.useRef(true);

    React.useEffect(() => {
        if (isFirstRender.current) {
            // The thumb is already positioned correctly on mount; animate on updates only.
            isFirstRender.current = false;
            return;
        }

        progress.value = withTiming(value ? 1 : 0, { duration: TRANSITION_DURATION });
    }, [progress, value]);

    const thumbAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: progress.value * TRAVEL_DISTANCE }],
    }));

    const onTrackAnimatedStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    return (
        <View
            style={[styles.track, { backgroundColor: theme.text3 }]}
            pointerEvents="none"
            accessible={false}
            importantForAccessibility="no-hide-descendants"
        >
            <Animated.View style={[styles.trackFill, { backgroundColor: theme.accent }, onTrackAnimatedStyle]} />
            <Animated.View style={[styles.thumb, thumbAnimatedStyle]} />
        </View>
    );
};

const styles = StyleSheet.create({
    track: {
        width: SWITCH_TRACK_WIDTH,
        height: SWITCH_TRACK_HEIGHT,
        borderRadius: TRACK_RADIUS,
        padding: TRACK_PADDING,
    },
    trackFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: TRACK_RADIUS,
    },
    thumb: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: '#FFFFFF',
    },
});
