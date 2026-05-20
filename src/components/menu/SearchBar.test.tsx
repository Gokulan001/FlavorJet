import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "./SearchBar";

afterEach(() => {
  // Tests append a #items-grid sibling outside the React root; clean it up
  document.getElementById("items-grid")?.remove();
});

function mountWithGrid() {
  // Append a sibling grid with three cards
  const grid = document.createElement("div");
  grid.id = "items-grid";
  for (const name of ["pizza", "burger", "salad"]) {
    const card = document.createElement("div");
    card.setAttribute("data-item-name", name);
    card.textContent = name;
    grid.appendChild(card);
  }
  document.body.appendChild(grid);
  return grid;
}

describe("SearchBar", () => {
  it("renders input + search icon and no clear button initially", () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText("Search dishes...")).toBeInTheDocument();
    // No clear button visible when query is empty
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides cards whose data-item-name doesn't include the query (case-insensitive)", async () => {
    const user = userEvent.setup();
    const grid = mountWithGrid();
    render(<SearchBar />);

    await user.type(screen.getByPlaceholderText("Search dishes..."), "PIZ");

    expect((grid.children[0] as HTMLElement).style.display).toBe(""); // pizza shown
    expect((grid.children[1] as HTMLElement).style.display).toBe("none"); // burger hidden
    expect((grid.children[2] as HTMLElement).style.display).toBe("none"); // salad hidden
  });

  it("shows clear button after typing and clicking it resets all cards", async () => {
    const user = userEvent.setup();
    const grid = mountWithGrid();
    render(<SearchBar />);

    await user.type(screen.getByPlaceholderText("Search dishes..."), "burger");
    expect((grid.children[0] as HTMLElement).style.display).toBe("none");

    const clearBtn = screen.getByRole("button");
    await user.click(clearBtn);

    expect((screen.getByPlaceholderText("Search dishes...") as HTMLInputElement).value).toBe("");
    expect((grid.children[0] as HTMLElement).style.display).toBe("");
    expect((grid.children[1] as HTMLElement).style.display).toBe("");
    expect((grid.children[2] as HTMLElement).style.display).toBe("");
  });

  it("does nothing when no #items-grid is present in the DOM", async () => {
    const user = userEvent.setup();
    render(<SearchBar />);
    // No throw expected
    await user.type(screen.getByPlaceholderText("Search dishes..."), "x");
    expect(screen.getByPlaceholderText("Search dishes...")).toHaveValue("x");
  });
});
