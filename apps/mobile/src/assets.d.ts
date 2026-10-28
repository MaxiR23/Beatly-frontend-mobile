// INFO: types a bundled PNG import as the source Picture takes; Metro resolves the file to an asset.
declare module "*.png" {
  const source: number;
  export default source;
}
