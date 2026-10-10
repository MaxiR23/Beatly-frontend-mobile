// INFO: the Android and iOS-fallback edit list: a fixed-height row per item with a remove button, its cover, title and subtitle, and a drag handle. Holding the handle lifts a copy of the row on color.surface.raised with shadow.floating that follows the finger while the others make room over motion.duration.fast (set at once under reduce motion), the list stops scrolling, and while the held row sits inside motion.reorder.edge of either end it auto-scrolls at motion.reorder.speed; releasing calls onMove(fromIndex, toIndex) with the final zero-based index when the row changed place, and a taken-away drag moves nothing. Every row is also one accessible element announcing its position, with move up and down actions, none past the ends. Every row stays mounted while a row is held, so the gesture is never lost.
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { color } from "../tokens/color.ts";
import { motion } from "../tokens/motion.ts";
import { shadow } from "../tokens/shadow.ts";
import { layout, spacing } from "../tokens/spacing.ts";
import type { EditListItem } from "./editList.ts";
import { Icon } from "./Icon.tsx";
import { IconButton } from "./IconButton.tsx";
import { MediaRow } from "./MediaRow.tsx";

const ROW_HEIGHT = layout.controlHeight + 2 * spacing.xs;

interface ReorderListProps {
  items: readonly EditListItem[];
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  moveUpLabel: string;
  moveDownLabel: string;
  moveHint: string;
  reduceMotion: boolean;
  bottomInset: number;
  testID?: string;
}

// The index of the row under the held row's centre, in content coordinates.
export function reorderIndexAt(centerY: number, rowHeight: number, count: number): number {
  return Math.min(Math.max(Math.floor(centerY / rowHeight), 0), Math.max(count - 1, 0));
}

// Points to scroll in `elapsedMs` while the finger is at `fingerY` from the list's top: up inside the top edge, down inside the bottom one, none elsewhere.
export function autoScrollStep(fingerY: number, viewportHeight: number, elapsedMs: number): number {
  const distance = (motion.reorder.speed * elapsedMs) / 1000;
  if (fingerY < motion.reorder.edge) return -distance;
  if (fingerY > viewportHeight - motion.reorder.edge) return distance;
  return 0;
}

interface Drag {
  from: number;
  hover: number;
}

interface Session extends Drag {
  startScroll: number;
  dy: number;
}

interface HandleCallbacks {
  onGrant: (index: number) => void;
  onMove: (dy: number) => void;
  onEnd: (commit: boolean) => void;
}

interface RowProps {
  item: EditListItem;
  index: number;
  count: number;
  shift: number;
  // False once the drag ended: the rows return to rest at once, because the list has already been reordered.
  animate: boolean;
  hidden: boolean;
  lifted?: boolean;
  reduceMotion: boolean;
  moveUpLabel: string;
  moveDownLabel: string;
  moveHint: string;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  handle: HandleCallbacks;
}

function Row({
  item,
  index,
  count,
  shift,
  animate,
  hidden,
  lifted = false,
  reduceMotion,
  moveUpLabel,
  moveDownLabel,
  moveHint,
  onMove,
  onRemove,
  handle,
}: RowProps) {
  const [offset] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion || !animate) {
      offset.setValue(shift);
      return;
    }
    Animated.timing(offset, {
      toValue: shift,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start();
  }, [offset, shift, animate, reduceMotion]);
  const latest = useRef({ index, handle });
  useEffect(() => {
    latest.current = { index, handle };
  });
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        latest.current.handle.onGrant(latest.current.index);
      },
      onPanResponderMove: (_event, gesture) => {
        latest.current.handle.onMove(gesture.dy);
      },
      onPanResponderRelease: () => {
        latest.current.handle.onEnd(true);
      },
      onPanResponderTerminate: () => {
        latest.current.handle.onEnd(false);
      },
    }),
  );
  const actions = [
    ...(index > 0 ? [{ name: "moveUp", label: moveUpLabel }] : []),
    ...(index < count - 1 ? [{ name: "moveDown", label: moveDownLabel }] : []),
  ];
  return (
    <Animated.View
      style={[
        styles.row,
        lifted ? styles.lifted : { transform: [{ translateY: offset }] },
        hidden && styles.hidden,
      ]}
      pointerEvents={lifted ? "none" : "auto"}
      testID={lifted ? "reorder-lifted" : `reorder-row-${String(index)}`}
    >
      <IconButton
        icon="x"
        accessibilityLabel={item.removeLabel}
        onPress={() => {
          onRemove(index);
        }}
      />
      <View
        style={styles.body}
        accessible
        accessibilityLabel={item.label}
        accessibilityValue={{ text: item.positionLabel }}
        accessibilityHint={moveHint}
        accessibilityActions={actions}
        onAccessibilityAction={(event) => {
          const name = event.nativeEvent.actionName;
          if (name === "moveUp") onMove(index, index - 1);
          if (name === "moveDown") onMove(index, index + 1);
        }}
      >
        <MediaRow title={item.title} subtitle={item.subtitle} urls={item.urls} shape="square" />
      </View>
      <View
        style={styles.handle}
        accessibilityRole="button"
        accessibilityLabel={item.moveLabel}
        testID={lifted ? undefined : `reorder-handle-${String(index)}`}
        {...(lifted ? {} : responder.panHandlers)}
      >
        <Icon name="gripVertical" size="lg" tone="secondary" />
      </View>
    </Animated.View>
  );
}

export function ReorderList({
  items,
  onMove,
  onRemove,
  moveUpLabel,
  moveDownLabel,
  moveHint,
  reduceMotion,
  bottomInset,
  testID,
}: ReorderListProps) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [liftedY] = useState(() => new Animated.Value(0));
  const list = useRef<FlatList<EditListItem>>(null);
  const scroll = useRef(0);
  const viewport = useRef(0);
  const session = useRef<Session | null>(null);
  const frame = useRef<number | null>(null);
  const latest = useRef({ items, onMove, reduceMotion, bottomInset });
  useEffect(() => {
    latest.current = { items, onMove, reduceMotion, bottomInset };
  });
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const centre = (s: Session): number =>
    s.from * ROW_HEIGHT + ROW_HEIGHT / 2 - s.startScroll + s.dy;
  const follow = () => {
    const s = session.current;
    if (s === null) return;
    const viewportCentre = centre(s);
    liftedY.setValue(viewportCentre - ROW_HEIGHT / 2);
    const hover = reorderIndexAt(
      viewportCentre + scroll.current,
      ROW_HEIGHT,
      latest.current.items.length,
    );
    if (hover !== s.hover) {
      s.hover = hover;
      setDrag({ from: s.from, hover });
    }
  };
  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    session.current = null;
    setDrag(null);
  };
  const handle: HandleCallbacks = {
    onGrant: (index) => {
      const s: Session = { from: index, hover: index, startScroll: scroll.current, dy: 0 };
      session.current = s;
      liftedY.setValue(centre(s) - ROW_HEIGHT / 2);
      setDrag({ from: index, hover: index });
      let last: number | null = null;
      const tick = (time: number) => {
        const current = session.current;
        if (current === null) return;
        const elapsed = last === null ? 0 : time - last;
        last = time;
        // Until the list has been laid out its height is unknown: no edge to be at.
        const step =
          viewport.current > 0 ? autoScrollStep(centre(current), viewport.current, elapsed) : 0;
        if (step !== 0) {
          const max = Math.max(
            0,
            latest.current.items.length * ROW_HEIGHT +
              latest.current.bottomInset -
              viewport.current,
          );
          const next = Math.min(Math.max(scroll.current + step, 0), max);
          if (next !== scroll.current) {
            scroll.current = next;
            list.current?.scrollToOffset({ offset: next, animated: false });
            follow();
          }
        }
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    onMove: (dy) => {
      const s = session.current;
      if (s === null) return;
      s.dy = dy;
      follow();
    },
    onEnd: (commit) => {
      const s = session.current;
      stop();
      if (commit && s !== null && s.hover !== s.from) latest.current.onMove(s.from, s.hover);
    },
  };

  const shiftOf = (index: number): number => {
    if (drag === null) return 0;
    if (index > drag.from && index <= drag.hover) return -ROW_HEIGHT;
    if (index < drag.from && index >= drag.hover) return ROW_HEIGHT;
    return 0;
  };
  const rowProps = {
    count: items.length,
    reduceMotion,
    moveUpLabel,
    moveDownLabel,
    moveHint,
    onMove,
    onRemove,
    handle,
  };
  const held = drag === null ? undefined : items[drag.from];
  return (
    <View
      style={styles.list}
      onLayout={(event: LayoutChangeEvent) => {
        viewport.current = event.nativeEvent.layout.height;
      }}
      testID={testID}
    >
      <FlatList
        ref={list}
        testID="reorder-scroll"
        data={items}
        keyExtractor={(item) => item.key}
        getItemLayout={(_data, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        extraData={drag}
        scrollEnabled={drag === null}
        scrollEventThrottle={16}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          scroll.current = event.nativeEvent.contentOffset.y;
        }}
        // Every row stays mounted while one is held: an unmounted handle would lose the gesture.
        windowSize={drag === null ? 21 : Math.max(21, items.length)}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        renderItem={({ item, index }) => (
          <Row
            item={item}
            index={index}
            shift={shiftOf(index)}
            animate={drag !== null}
            hidden={drag?.from === index}
            {...rowProps}
          />
        )}
      />
      {held !== undefined && drag !== null ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, { transform: [{ translateY: liftedY }] }]}
        >
          <Row
            item={held}
            index={drag.from}
            shift={0}
            animate={false}
            hidden={false}
            lifted
            {...rowProps}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
  },
  body: { flex: 1, justifyContent: "center" },
  handle: {
    width: layout.controlHeight,
    height: layout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  hidden: { opacity: 0 },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, height: ROW_HEIGHT },
  lifted: { backgroundColor: color.surface.raised, ...shadow.floating },
});
