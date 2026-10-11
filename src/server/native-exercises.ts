import type { Exercise } from "./practice.js";

export function nativeExercises(): Exercise[] {
  return (["c", "cpp"] as const).flatMap((language) => {
    const base: Exercise = {
      id: `${language}-validation`,
      title: "Build a native price calculator",
      language,
      kind: "practice",
      skill: "Validation and numeric boundaries",
      minutes: 20,
      brief:
        "Implement a small pricing function without copying the lesson. Separate valid inputs from invalid ones and predict each result before compiling.",
      requirements: [
        "Implement double discounted_price(double price, double discount).",
        "Return the discounted price for non-negative prices and discounts between 0 and 100 inclusive.",
        "Return -1 for a negative price or a discount outside 0–100. Do not add main(); OutClass supplies the check harness.",
      ],
      hints: [
        "Which inputs must be rejected before arithmetic?",
        "Write the valid range for each parameter, then test its endpoints.",
        "Compute the fraction that remains after the discount. Predict zero and 100 percent before compiling.",
      ],
      function: "discounted_price",
      starter:
        "#include <math.h>\n\n/* Implement your own reasoning. Keep main() in separate project files. */\ndouble discounted_price(double price, double discount) {\n    (void)price; (void)discount;\n    return -2; /* Not implemented */\n}\n",
      cases: [
        "A normal discount",
        "Zero discount",
        "Full discount",
        "Reject negative price",
        "Reject excessive discount",
        "Reject negative discount",
      ].map((label) => ({ label, args: [] })),
      nativeChecks: [
        "fabs(discounted_price(100, 25) - 75) < 1e-8",
        "fabs(discounted_price(40, 0) - 40) < 1e-8",
        "discounted_price(40, 100) == 0",
        "discounted_price(-1, 10) == -1",
        "discounted_price(20, 101) == -1",
        "discounted_price(20, -1) == -1",
      ],
      topics: [
        "function",
        "validation",
        "condition",
        "numeric",
        "number",
        "math",
      ],
    };
    return [
      base,
      {
        ...base,
        id: `${base.id}-transfer`,
        transferFrom: base.id,
        title: "Handle non-finite numeric inputs",
        minutes: 15,
        brief:
          "Your function now receives computed values from another module. Preserve valid pricing behavior while rejecting NaN and infinity. Explain why range comparisons alone may miss this case.",
        requirements: [
          ...base.requirements,
          "Return -1 if either argument is not finite. Preserve all earlier behaviors.",
        ],
        hints: [
          "How does NaN behave in greater-than and less-than comparisons?",
          "Check finiteness separately from the numeric range.",
          "Try NaN in each parameter and an infinite price. Compare the result with the contract.",
        ],
        cases: [
          ...base.cases,
          ...[
            "Reject a NaN price",
            "Reject a NaN discount",
            "Reject an infinite price",
          ].map((label) => ({ label, args: [] })),
        ],
        nativeChecks: [
          ...base.nativeChecks!,
          "discounted_price(NAN, 10) == -1",
          "discounted_price(20, NAN) == -1",
          "discounted_price(INFINITY, 10) == -1",
        ],
      },
    ];
  });
}

export function nativeHarness(spec: Exercise, source: string, prefix: string) {
  const rows = spec.cases
    .map(
      (test, i) =>
        `printf("%s%s%s", ${JSON.stringify(JSON.stringify({ label: test.label }).slice(0, -1) + ',"passed":')}, (${spec.nativeChecks![i]}) ? "true" : "false", ${JSON.stringify(i + 1 < spec.cases.length ? "}," : "}")});`,
    )
    .join("\n");
  return `#include <stdio.h>\n#include <math.h>\n#include ${JSON.stringify(source.replaceAll("\\", "/"))}\nint main(void) {\nprintf("%s", ${JSON.stringify(prefix + "[")});\n${rows}\nputs("]");\nreturn 0;\n}\n`;
}
