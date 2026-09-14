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
    id: "openSettings",
    label: "Settings",
    description: "Open settings (keyboard shortcuts & themes)",
  },
  {
    id: "search",
    label: "Search",
    description: "Search notes across this vault or all vaults",
  },
  {
    id: "goBack",
    label: "Go Back",
    description: "Navigate to the previously opened note",
  },
  {
    id: "goForward",
    label: "Go Forward",
    description: "Navigate to the next note in history",
  },
];

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  togglePreview: { key: "p", mod: true, shift: false, alt: false },
  newNote: { key: "n", mod: true, shift: false, alt: false },
  saveNote: { key: "s", mod: true, shift: false, alt: false },
  openVault: { key: "o", mod: true, shift: false, alt: false },
  toggleSidebar: { key: "b", mod: true, shift: false, alt: false },
  openSettings: { key: ",", mod: true, shift: false, alt: false },
  search: { key: "f", mod: true, shift: false, alt: false },
  goBack: { key: "[", mod: true, shift: false, alt: false },
  goForward: { key: "]", mod: true, shift: false, alt: false },
};

export const SHORTCUTS_STORAGE_KEY = "dump-it-shortcuts";
