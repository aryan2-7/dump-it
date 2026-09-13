export type ActionId =
  | "togglePreview"
  | "newNote"
  | "openVault"
  | "saveNote"
  | "openShortcutManager"
  | "toggleSidebar"
  | "search";

export interface ShortcutBinding {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

export interface ShortcutAction {
  id: ActionId;
  label: string;
  description: string;
}

export type ShortcutMap = Record<ActionId, ShortcutBinding>;
