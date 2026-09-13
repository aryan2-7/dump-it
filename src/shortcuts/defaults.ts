import type { ShortcutAction, ShortcutMap } from "./types";

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  {
    id: "togglePreview",
    label: "Toggle Preview",
    description: "Show or hide the markdown preview pane",
  },
  {
    id: "newNote",
    label: "New Note",
    description: "Create a new markdown note in the vault",
  },
  {
    id: "saveNote",
    label: "Save Note",
    description: "Save the current note immediately",
  },
  {
    id: "openVault",
    label: "Open Vault",
    description: "Open or switch the vault folder",
  },
  {
    id: "toggleSidebar",
    label: "Toggle Sidebar",
    description: "Show or hide the file tree sidebar",
  },
  {
    id: "openShortcutManager",
    label: "Shortcut Manager",
    description: "Open the keyboard shortcuts settings",
  },
];

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  togglePreview: { key: "p", mod: true, shift: false, alt: false },
  newNote: { key: "n", mod: true, shift: false, alt: false },
  saveNote: { key: "s", mod: true, shift: false, alt: false },
  openVault: { key: "o", mod: true, shift: true, alt: false },
  toggleSidebar: { key: "b", mod: true, shift: false, alt: false },
  openShortcutManager: { key: ",", mod: true, shift: false, alt: false },
};

export const SHORTCUTS_STORAGE_KEY = "dump-it-shortcuts";
