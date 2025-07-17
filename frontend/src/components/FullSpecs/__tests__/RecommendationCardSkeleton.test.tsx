import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RecommendationCardSkeleton from "../RecommendationCardSkeleton";

describe("RecommendationCardSkeleton", () => {
  test("renders skeleton elements with animation", () => {
    render(<RecommendationCardSkeleton />);

    // Check if the skeleton has the expected structure
    const skeletonElement = screen.getByTestId("recommendation-skeleton");
    expect(skeletonElement).toBeInTheDocument();
    expect(skeletonElement).toHaveClass("animate-pulse");
  });

  test("matches the structure of the RecommendationCard component", () => {
    render(<RecommendationCardSkeleton />);

    // Check for the skeleton element
    const skeletonElement = screen.getByTestId("recommendation-skeleton");

    // Verify the skeleton has the expected structure
    expect(skeletonElement).toBeInTheDocument();

    // Check that it has the proper responsive classes
    expect(skeletonElement).toHaveClass("min-w-[180px]");
    expect(skeletonElement).toHaveClass("md:w-full");
  });
});
