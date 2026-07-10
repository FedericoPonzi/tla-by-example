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
  it("adds an anchor for the BlockingQueue Tutorial section", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { name: "BlockingQueue Tutorial" });
    expect(heading.closest("section")).toHaveAttribute("id", "blocking-queue-tutorial");
  });
});
