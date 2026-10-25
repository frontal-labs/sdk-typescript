/**
 * Tests for decision questions: local validation, and answer-type inference.
 * Runtime checks run under vitest; the expectTypeOf checks are verified by the
 * type-check step in the scratch tsconfig described in the PR.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import {
  type Answers,
  assertValidDecision,
  type ChoiceAnswer,
  choice,
  DecisionRequestError,
  type NoulAnswer,
  noul,
  type ScoreAnswer,
  score,
  validateQuestions,
  validateState,
} from "../src/decisions";

describe("question helpers", () => {
  it("builds noul, choice and score questions", () => {
    expect(noul("Is this billing?")).toEqual({
      type: "noul",
      instructions: "Is this billing?",
    });
    expect(choice("Topic?", { billing: null, technical: "bugs" })).toEqual({
      type: "choice",
      instructions: "Topic?",
      criteria: { billing: null, technical: "bugs" },
    });
    expect(score("Severity?", ["low", "high"])).toEqual({
      type: "score",
      instructions: "Severity?",
      criteria: ["low", "high"],
    });
  });
});

describe("validateState", () => {
  it("requires a state", () => {
    expect(validateState(null)).toEqual([
      { path: "state", message: "must be provided" },
    ]);
    expect(validateState(undefined)).toHaveLength(1);
  });

  it("reports NaN and Infinity with their path", () => {
    expect(
      validateState({
        order: { total: Number.NaN, items: [Number.POSITIVE_INFINITY] },
      })
    ).toEqual([
      { path: "state.order.total", message: "must be a finite number" },
      { path: "state.order.items[0]", message: "must be a finite number" },
    ]);
  });

  it("reports cycles instead of looping", () => {
    const state: Record<string, unknown> = { name: "a" };
    state.self = state;
    expect(validateState(state)).toEqual([
      { path: "state.self", message: "must not contain cycles" },
    ]);
  });

  it("accepts plain JSON-compatible state", () => {
    expect(validateState({ text: "hi", n: 3, list: [true, null] })).toEqual([]);
  });
});

describe("validateQuestions", () => {
  it("rejects an empty question set", () => {
    expect(validateQuestions({})).toEqual([
      { path: "questions", message: "must not be empty" },
    ]);
  });

  it("accepts a noul with criteria and blank instructions", () => {
    expect(
      validateQuestions({
        q: { type: "noul", instructions: " ", criteria: { true: "yes" } },
      })
    ).toEqual([]);
  });

  it("rejects a noul with neither instructions nor criteria", () => {
    expect(
      validateQuestions({ q: { type: "noul", instructions: "" } })
    ).toEqual([
      {
        path: "questions.q",
        message: "needs instructions or a criteria description",
      },
    ]);
  });

  it("rejects a choice with no labels", () => {
    expect(validateQuestions({ q: choice("Pick", {}) })).toEqual([
      { path: "questions.q", message: "needs at least one choice label" },
    ]);
  });

  it("rejects score levels that are null or blank", () => {
    const bad = {
      q: { type: "score", instructions: "Rate", criteria: ["low", null] },
    } as unknown as Parameters<typeof validateQuestions>[0];
    expect(validateQuestions(bad)).toEqual([
      {
        path: "questions.q.criteria[1]",
        message: "must be non-empty text, not null",
      },
    ]);
  });

  it("rejects a score rubric with fewer than two levels", () => {
    const bad = {
      q: { type: "score", instructions: "Rate", criteria: ["only"] },
    } as unknown as Parameters<typeof validateQuestions>[0];
    expect(validateQuestions(bad)).toEqual([
      { path: "questions.q", message: "needs at least two score levels" },
    ]);
  });
});

describe("assertValidDecision", () => {
  it("throws one error listing every issue", () => {
    let caught: unknown;
    try {
      assertValidDecision(
        { value: Number.NaN },
        { q: { type: "noul", instructions: "" } }
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(DecisionRequestError);
    expect((caught as DecisionRequestError).issues).toHaveLength(2);
  });

  it("passes valid input", () => {
    expect(() =>
      assertValidDecision({ text: "x" }, { q: noul("Is it x?") })
    ).not.toThrow();
  });
});

describe("answer type inference", () => {
  it("types a choice answer from its label keys", () => {
    const questions = {
      topic: choice("Topic?", { billing: null, technical: null }),
    };
    type A = Answers<typeof questions>["topic"];
    expectTypeOf<A>().toEqualTypeOf<
      ChoiceAnswer<{ billing: null; technical: null }>
    >();
    expectTypeOf<A["choice"]>().toEqualTypeOf<"billing" | "technical">();
  });

  it("stringifies numeric choice labels (Jev issue #4)", () => {
    const q = choice("Priority?", { 1: null, 2: null });
    type L = ChoiceAnswer<typeof q.criteria>["choice"];
    expectTypeOf<L>().toEqualTypeOf<"1" | "2">();
  });

  it("types a noul answer as a number", () => {
    const questions = { yes: noul("Is it?") };
    expectTypeOf<
      Answers<typeof questions>["yes"]
    >().toEqualTypeOf<NoulAnswer>();
  });

  it("types a score answer with its level union", () => {
    const q = score("Severity?", ["low", "medium", "high"] as const);
    type S = ScoreAnswer<typeof q.criteria>;
    expectTypeOf<S["level"]>().toEqualTypeOf<"low" | "medium" | "high">();
  });

  it("rejects a score rubric with null levels at compile time", () => {
    // @ts-expect-error null is not a valid score level
    score("Severity?", ["low", null]);
    // @ts-expect-error a score needs at least two levels
    score("Severity?", ["only"]);
    expect(true).toBe(true);
  });
});
