import type { Rule } from "../types.js";
import { badgeWall, boldOveruse, emDash, exclamation, lateQuickstart, longParagraph } from "./density.js";
import { aiVocab, chatbot, filler, hype, ingTail, notJust, wordy } from "./phrases.js";
import { noDemo, noInstall, noIntro, noLicense, noToc, noUsage } from "./sections.js";
import { boldList, emojiBullets, emojiHeadings, genericHeadings, numberedHeadings, titleCase } from "./structure.js";

/** Every rule, in the order --rules lists them. A new rule goes in one of the rule files and here. */
export const rules: Rule[] = [
  chatbot,
  hype,
  filler,
  notJust,
  aiVocab,
  ingTail,
  wordy,
  boldList,
  emojiBullets,
  emojiHeadings,
  numberedHeadings,
  titleCase,
  genericHeadings,
  longParagraph,
  emDash,
  boldOveruse,
  exclamation,
  badgeWall,
  lateQuickstart,
  noIntro,
  noInstall,
  noUsage,
  noDemo,
  noLicense,
  noToc,
];
