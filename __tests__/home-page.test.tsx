import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "@/app/page";

jest.mock("next/link", () => {
  return ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
});

jest.mock("@/content/intro", () => ({
  introLessons: [
    {
      slug: "intro-1",
      title: "Intro 1",
    },
  ],
}));

jest.mock("@/content/blocking-queue", () => ({
  blockingQueueLessons: [
    {
      slug: "bq-1",
      title: "Blocking Queue 1",
    },
  ],
}));

jest.mock("@/lib/specs", () => ({
  getBeginnerSpecs: () => [
    {
      slug: "spec-1",
      name: "Spec 1",
      authors: ["Alice"],
    },
  ],
}));

describe("Home page", () => {
  it("adds anchors for the major landing page sections", () => {
    render(<Home />);
    const introHeading = screen.getByRole("heading", { name: "How to Write TLA+" });
    expect(introHeading.closest("section")).toHaveAttribute("id", "how-to-write-tla");

    const blockingQueueHeading = screen.getByRole("heading", {
      name: "BlockingQueue Tutorial",
    });
    expect(blockingQueueHeading.closest("section")).toHaveAttribute(
      "id",
      "blocking-queue-tutorial",
    );

    const communityHeading = screen.getByRole("heading", {
      name: "Community Specifications",
    });
    expect(communityHeading).toHaveAttribute("id", "community-specifications");
  });
});
