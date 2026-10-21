// INFO: masks its children with the alpha of the mask element, filling its parent. The parent
// supplies the size. The only importer of @react-native-masked-view/masked-view. On iOS the mask
// element is the native view's mask, so animating the mask's opacity fades the children without
// giving them or their parents an opacity (what a system blur needs).
import MaskedView from "@react-native-masked-view/masked-view";
import type { ReactElement, ReactNode } from "react";
import { StyleSheet } from "react-native";

interface AlphaMaskProps {
  mask: ReactElement;
  children: ReactNode;
  testID?: string;
}

export function AlphaMask({ mask, children, testID }: AlphaMaskProps) {
  return (
    <MaskedView style={StyleSheet.absoluteFill} maskElement={mask} testID={testID}>
      {children}
    </MaskedView>
  );
}
