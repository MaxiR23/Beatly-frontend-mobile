// INFO: which sheet a host draws and whether it is shown, so a sheet stays drawn through its close animation: show() opens one at once, or after the one on screen has closed; hide() starts the close; closed(), passed as the Sheet's onClosed, drops it or opens the one waiting.
import { useState } from "react";

interface Presence<T> {
  current: T | null;
  visible: boolean;
  next: T | null;
}

export function useSheetPresence<T>() {
  const [state, setState] = useState<Presence<T>>({ current: null, visible: false, next: null });
  return {
    current: state.current,
    visible: state.visible,
    show: (value: T) => {
      setState((s) =>
        s.current === null
          ? { current: value, visible: true, next: null }
          : { ...s, visible: false, next: value },
      );
    },
    hide: () => {
      setState((s) => ({ ...s, visible: false, next: null }));
    },
    closed: () => {
      setState((s) =>
        s.next === null
          ? { current: null, visible: false, next: null }
          : { current: s.next, visible: true, next: null },
      );
    },
  };
}
