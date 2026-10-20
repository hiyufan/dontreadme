import type { Rule } from "../types.js";
import { badgeWall, emDash, exclamation, lateQuickstart, longParagraph } from "./density.js";
import { filler, hype, notJust, wordy } from "./phrases.js";
import { boldList, emojiBullets, emojiHeadings, genericHeadings } from "./structure.js";

/** Every rule, in the order --rules lists them. A new rule goes in one of the three files and here. */
export const rules: Rule[] = [
  hype,
  filler,
  notJust,
  wordy,
  boldList,
  emojiBullets,
  emojiHeadings,
  genericHeadings,
  longParagraph,
  emDash,
  exclamation,
  badgeWall,
  lateQuickstart,
];
