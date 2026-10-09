// INFO: a row of an edit list, NativeEditList or ReorderList: the texts and cover it draws and the labels a screen reader reads, all translated by the caller.
export interface EditListItem {
  key: string;
  title: string;
  subtitle?: string | undefined;
  // ReorderList's cover; NativeEditList draws no cover.
  urls: readonly string[];
  // What a screen reader reads for the row: title and artists.
  label: string;
  // "3 of 40".
  positionLabel: string;
  // "Remove <title>".
  removeLabel: string;
  // "Move <title>", the Android handle.
  moveLabel: string;
}
