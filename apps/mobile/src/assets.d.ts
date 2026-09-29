// INFO: types a bundled PNG import as the source the Image component takes; Metro resolves the file to an asset.
declare module "*.png" {
  import type { ImageSourcePropType } from "react-native";
  const source: ImageSourcePropType;
  export default source;
}
