// INFO: whether the system asks for reduced motion, false until known; follows the setting; a failed read is logged and leaves motion on.
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { useCore } from "../../providers/CoreProvider.tsx";

export function useReduceMotion(): boolean {
  const { log } = useCore();
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let ignore = false;
    AccessibilityInfo.isReduceMotionEnabled().then(
      (value) => {
        if (!ignore) setReduce(value);
      },
      (error: unknown) => {
        log.warn("reduceMotion.failed", { message: String(error) });
      },
    );
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      ignore = true;
      subscription.remove();
    };
  }, [log]);
  return reduce;
}
