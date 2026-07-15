import matter from "gray-matter";
import type { Lesson, ExtraTab } from "./lessons";

const SPEC_DIVIDER = "---TLA_BY_EXAMPLE_SPEC---";
const CFG_DIVIDER = "---TLA_BY_EXAMPLE_CFG---";
const TAB_REGEX = /^---TLA_BY_EXAMPLE_TAB\s+label="([^"]+)"---$/;

export function parseLesson(markdown: string): Lesson {
  const { data, content } = matter(markdown);

  let description = content;
  let spec = "";
  let cfg = "";
  const extraTabs: ExtraTab[] = [];

  const specIdx = description.indexOf(SPEC_DIVIDER);
  if (specIdx !== -1) {
    const afterSpec = description.slice(specIdx + SPEC_DIVIDER.length);
    description = description.slice(0, specIdx);

    const cfgIdx = afterSpec.indexOf(CFG_DIVIDER);
    if (cfgIdx !== -1) {
      spec = afterSpec.slice(0, cfgIdx).trim();
      const afterCfg = afterSpec.slice(cfgIdx + CFG_DIVIDER.length);
      const lines = afterCfg.split("\n");
      let cfgLines: string[] = [];
      let currentTab: ExtraTab | null = null;
      let currentLines: string[] = [];

      for (const line of lines) {
        const tabMatch = line.match(TAB_REGEX);
        if (tabMatch) {
          if (currentTab) {
            currentTab.content = currentLines.join("\n").trim();
            extraTabs.push(currentTab);
          } else {
            cfg = cfgLines.join("\n").trim();
          }
          currentTab = { label: tabMatch[1], content: "" };
          currentLines = [];
        } else if (currentTab) {
          currentLines.push(line);
        } else {
          cfgLines.push(line);
        }
      }

      if (currentTab) {
        currentTab.content = currentLines.join("\n").trim();
        extraTabs.push(currentTab);
      } else {
        cfg = cfgLines.join("\n").trim();
      }
    } else {
      spec = afterSpec.trim();
    }
  }

  description = description.trim();

  const lesson: Lesson = {
    slug: data.slug,
    title: data.title,
    section: data.section,
    description,
    spec,
    cfg,
  };

  if (data.commitSha) lesson.commitSha = data.commitSha;
  if (data.commitUrl) lesson.commitUrl = data.commitUrl;
  if (data.expect) lesson.expect = data.expect;
  if (extraTabs.length > 0) lesson.extraTabs = extraTabs;

  return lesson;
}
