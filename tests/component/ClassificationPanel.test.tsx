// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClassificationPanel } from "@/components/occurrence/ClassificationPanel";
import type {
  Occurrence,
  OccurrenceSubcategoryOption,
} from "@/prisma/generated/prisma/client";

/**
 * Component tests for ClassificationPanel's two most interactive
 * behaviors: the rule-based Suggested Classification affordance
 * (product-spec.md §11.1 — must require explicit Accept, never auto-apply)
 * and the Override toggle (data-model.md §6.5 — always available, always
 * requires a written justification). Scoped to rendering/interaction, per
 * testing-spec.md §12's own stated boundary between component tests and
 * integration tests — the Server Actions these forms submit to are
 * exercised for real in tests/integration/, not re-mocked-and-asserted
 * here.
 */
vi.mock("@/lib/actions/occurrence", () => ({
  generateClassificationSuggestionAction: vi.fn(),
  saveOccurrenceClassificationAction: vi.fn(async () => ({ error: null })),
  saveOccurrenceOutcomeAction: vi.fn(async () => ({ error: null })),
  overrideOccurrenceFieldAction: vi.fn(async () => ({ error: null })),
}));

import { generateClassificationSuggestionAction } from "@/lib/actions/occurrence";

const BASE_OCCURRENCE = {
  occurrenceCategory: null,
  occurrenceSubcategoryId: null,
  actualOutcomeSeverity: null,
  potentialOutcomeSeverity: null,
  likelihoodOfRecurrence: null,
  actualOutcomeDescription: null,
  potentialOutcomeDescription: null,
  severityOverridden: false,
  severity: null,
  riskScore: null,
  riskBand: null,
  priorityOverridden: false,
  investigationPriority: null,
} as unknown as Occurrence;

const SUBCATEGORIES: OccurrenceSubcategoryOption[] = [];

function renderPanel(overrides: Partial<Occurrence> = {}) {
  return render(
    <ClassificationPanel
      investigationId={1}
      occurrence={{ ...BASE_OCCURRENCE, ...overrides }}
      subcategories={SUBCATEGORIES}
      readOnly={false}
    />,
  );
}

describe("ClassificationPanel — Suggested Classification (rule-based, not AI)", () => {
  it("requires explicit Accept before populating the Category field — never auto-applies", async () => {
    vi.mocked(generateClassificationSuggestionAction).mockResolvedValueOnce({
      error: null,
      suggestion: {
        category: "AircraftIncident",
        subcategory: "Runway Excursion",
        matchedKeywords: ["runway", "excursion"],
        confidence: "High",
      },
    });

    const user = userEvent.setup();
    renderPanel();

    const categorySelect = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(categorySelect.value).toBe("");

    await user.click(screen.getByRole("button", { name: "Suggest Classification" }));

    // The mandated exact label (product-spec.md §11.1) — never a generic
    // "AI Suggestion" or similar.
    expect(await screen.findByText("Investigation Support · Suggested Classification")).toBeInTheDocument();
    expect(screen.getByText(/Matched: runway, excursion/)).toBeInTheDocument();

    // Not yet applied — the suggestion is visible, but the real field is untouched.
    expect(categorySelect.value).toBe("");

    await user.click(screen.getByRole("button", { name: "Accept" }));

    expect(categorySelect.value).toBe("AircraftIncident");
    expect(screen.queryByText("Investigation Support · Suggested Classification")).not.toBeInTheDocument();
  });

  it("dismissing a suggestion discards it without touching the Category field", async () => {
    vi.mocked(generateClassificationSuggestionAction).mockResolvedValueOnce({
      error: null,
      suggestion: {
        category: "GroundHandlingIncident",
        subcategory: "Ramp Collision",
        matchedKeywords: ["ramp"],
        confidence: "Low",
      },
    });

    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Suggest Classification" }));
    await screen.findByText("Investigation Support · Suggested Classification");

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("Investigation Support · Suggested Classification")).not.toBeInTheDocument();
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("");
  });

  it("shows a manual-classification prompt rather than a low-confidence guess when nothing matches", async () => {
    vi.mocked(generateClassificationSuggestionAction).mockResolvedValueOnce({
      error: null,
      suggestion: null,
    });

    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Suggest Classification" }));

    expect(
      await screen.findByText("No confident suggestion available — please classify manually."),
    ).toBeInTheDocument();
  });
});

describe("ClassificationPanel — Override toggle", () => {
  // "Catastrophic"/"Immediate" etc. also appear as <option> text in the
  // always-rendered Actual/Potential Outcome and Priority displays, so
  // these queries target the override form's fields by `name` attribute
  // rather than by option label text, which would be ambiguous.

  it("reveals a justification field and a severity-value select only after clicking Severity's Override button", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel({ severity: "Major" } as Partial<Occurrence>);

    expect(screen.queryByPlaceholderText(/Justification/)).not.toBeInTheDocument();
    expect(container.querySelector('select[name="severityValue"]')).not.toBeInTheDocument();

    const overrideButtons = screen.getAllByRole("button", { name: "Override" });
    await user.click(overrideButtons[0]); // Severity's Override button

    expect(screen.getByPlaceholderText(/Justification \(minimum 20 characters\)/)).toBeInTheDocument();
    expect(container.querySelector('select[name="severityValue"]')).toBeInTheDocument();
    expect(container.querySelector('select[name="priorityValue"]')).not.toBeInTheDocument();
  });

  it("Cancel closes the override form without requiring submission", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getAllByRole("button", { name: "Override" })[0]);
    expect(screen.getByPlaceholderText(/Justification/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText(/Justification/)).not.toBeInTheDocument();
  });

  it("toggles between Severity and Investigation Priority override forms independently", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();

    const overrideButtons = screen.getAllByRole("button", { name: "Override" });
    await user.click(overrideButtons[1]); // Investigation Priority's Override button

    expect(container.querySelector('select[name="priorityValue"]')).toBeInTheDocument();
    expect(container.querySelector('select[name="severityValue"]')).not.toBeInTheDocument();
  });
});

describe("ClassificationPanel — computed vs. overridden labeling (fact vs. assessment)", () => {
  it("labels a not-yet-overridden field as Computed, never silently as a fact", async () => {
    renderPanel({ severity: "Minor", severityOverridden: false } as Partial<Occurrence>);
    await waitFor(() => expect(screen.getAllByText("Computed").length).toBeGreaterThan(0));
  });

  it("labels an overridden field as Overridden, distinct from the computed default", async () => {
    renderPanel({ severity: "Moderate", severityOverridden: true } as Partial<Occurrence>);
    await waitFor(() => expect(screen.getByText("Overridden")).toBeInTheDocument());
  });
});
