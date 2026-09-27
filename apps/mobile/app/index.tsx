// INFO: the single empty route; draws nothing but the dark base surface.
import { color } from "@beatly/ui";
import { View } from "react-native";

export default function Index() {
  return <View testID="root-route" style={{ flex: 1, backgroundColor: color.surface.base }} />;
}
