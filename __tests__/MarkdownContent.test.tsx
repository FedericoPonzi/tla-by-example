/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import MarkdownContent from "@/components/MarkdownContent";
import { blockingQueueLessons } from "@/content/blocking-queue";

describe("MarkdownContent", () => {
  it("renders headings", () => {
    render(<MarkdownContent content="# Hello World" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders bold text", () => {
    render(<MarkdownContent content="This is **bold** text" />);
    expect(screen.getByText("bold")).toBeInTheDocument();
  });

  it("renders links", () => {
    render(<MarkdownContent content="[Click here](https://example.com)" />);
    const link = screen.getByText("Click here");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("renders code blocks", () => {
    render(<MarkdownContent content="Use `inline code` here" />);
    expect(screen.getByText("inline code")).toBeInTheDocument();
  });

  it("preserves the worked deadlock trace as a code block", () => {
    const lesson = blockingQueueLessons.find((l) => l.slug === "safety");
    const { container } = render(<MarkdownContent content={lesson!.description} />);
    const trace = Array.from(container.querySelectorAll("pre code")).find(
      (code) => code.textContent?.includes("State 8:")
    );
    expect(trace?.textContent).toContain("State 1: <Initial predicate>\n");
    expect(trace?.textContent).toContain("/\\ waitSet = {p1, c1, c2}");
  });

  it("renders a copyable deadlock-free inequality", () => {
    const lesson = blockingQueueLessons.find((l) => l.slug === "inequation");
    const { container } = render(<MarkdownContent content={lesson!.description} />);
    const code = Array.from(container.querySelectorAll("code")).map(
      (element) => element.textContent
    );
    expect(code).toContain("2 * BufCapacity >= Cardinality(Producers \\cup Consumers)");
  });
});
