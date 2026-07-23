import { readFile } from "node:fs/promises";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function gateError(message) {
  return new Error(`Playwright coverage gate failed: ${message}`);
}

function assertReport(report, expectedCount) {
  if (!Number.isInteger(expectedCount) || expectedCount < 1) {
    throw gateError("expectedCount must be a positive integer.");
  }
  if (!isRecord(report)) {
    throw gateError("report must be an object.");
  }
  if (!isRecord(report.config)) {
    throw gateError("config is missing or invalid.");
  }
  if (!Array.isArray(report.errors)) {
    throw gateError("root errors must be an array.");
  }
  if (report.errors.length > 0) {
    throw gateError(`root errors contains ${report.errors.length} error(s).`);
  }
  if (!Array.isArray(report.suites) || report.suites.length === 0) {
    throw gateError("suites must be a non-empty array.");
  }

  let specCount = 0;
  let testCount = 0;

  function inspectSuite(suite, suitePath) {
    if (!isRecord(suite)) {
      throw gateError(`${suitePath} must be an object.`);
    }
    if (!Array.isArray(suite.specs)) {
      throw gateError(`${suitePath}.specs must be an array.`);
    }

    for (const [specIndex, spec] of suite.specs.entries()) {
      const specPath = `${suitePath}.specs[${specIndex}]`;
      if (!isRecord(spec)) {
        throw gateError(`${specPath} must be an object.`);
      }
      if (spec.ok !== true) {
        throw gateError(`${specPath}.ok must be true.`);
      }
      if (!Array.isArray(spec.tests) || spec.tests.length === 0) {
        throw gateError(`${specPath}.tests must be a non-empty array.`);
      }

      specCount += 1;
      for (const [testIndex, test] of spec.tests.entries()) {
        const testPath = `${specPath}.tests[${testIndex}]`;
        if (!isRecord(test)) {
          throw gateError(`${testPath} must be an object.`);
        }
        if (test.expectedStatus !== "passed") {
          throw gateError(
            `${testPath}.expectedStatus=${String(test.expectedStatus)}; required passed.`,
          );
        }
        if (test.status !== "expected") {
          throw gateError(
            `${testPath}.status=${String(test.status)}; required expected.`,
          );
        }
        if (!Array.isArray(test.results) || test.results.length === 0) {
          throw gateError(`${testPath}.results must be a non-empty array.`);
        }

        const finalResult = test.results.at(-1);
        if (!isRecord(finalResult)) {
          throw gateError(`${testPath} final result must be an object.`);
        }
        if (finalResult.status !== "passed") {
          throw gateError(
            `${testPath} final result status=${String(finalResult.status)}; required passed.`,
          );
        }
        if (
          !Array.isArray(finalResult.errors) ||
          finalResult.errors.length > 0
        ) {
          throw gateError(
            `${testPath} final result errors must be an empty array.`,
          );
        }
        testCount += 1;
      }
    }

    if (suite.suites !== undefined) {
      if (!Array.isArray(suite.suites)) {
        throw gateError(`${suitePath}.suites must be an array when present.`);
      }
      for (const [childIndex, childSuite] of suite.suites.entries()) {
        inspectSuite(childSuite, `${suitePath}.suites[${childIndex}]`);
      }
    }
  }

  for (const [suiteIndex, suite] of report.suites.entries()) {
    inspectSuite(suite, `suites[${suiteIndex}]`);
  }

  if (specCount === 0) {
    throw gateError("no specs were reported.");
  }
  if (testCount !== expectedCount) {
    throw gateError(
      `reported test count=${testCount}; required ${expectedCount}.`,
    );
  }

  const stats = report.stats;
  if (!isRecord(stats)) {
    throw gateError("stats is missing or invalid.");
  }
  for (const field of ["expected", "skipped", "unexpected", "flaky"]) {
    if (!Number.isInteger(stats[field]) || stats[field] < 0) {
      throw gateError(`stats.${field} must be a non-negative integer.`);
    }
  }
  if (
    stats.expected !== expectedCount ||
    stats.skipped !== 0 ||
    stats.unexpected !== 0 ||
    stats.flaky !== 0
  ) {
    throw gateError(
      [
        `stats.expected=${stats.expected} (required ${expectedCount})`,
        `stats.skipped=${stats.skipped}`,
        `stats.unexpected=${stats.unexpected}`,
        `stats.flaky=${stats.flaky}`,
      ].join(" "),
    );
  }
}

function passingReport(expectedCount = 2) {
  const specs = Array.from({ length: expectedCount }, (_, index) => ({
    title: `critical scenario ${index + 1}`,
    ok: true,
    tags: [],
    tests: [
      {
        timeout: 60_000,
        annotations: [],
        expectedStatus: "passed",
        projectId: "mobile-chromium",
        projectName: "mobile-chromium",
        results: [
          {
            workerIndex: 0,
            parallelIndex: 0,
            status: "passed",
            duration: 10,
            errors: [],
            stdout: [],
            stderr: [],
            retry: 0,
            startTime: "2026-07-23T00:00:00.000Z",
            attachments: [],
          },
        ],
        status: "expected",
      },
    ],
    id: `critical-${index + 1}`,
    file: "e2e/critical.spec.ts",
    line: index + 1,
    column: 1,
  }));

  return {
    config: {
      rootDir: "/workspace",
      projects: [{ id: "mobile-chromium", name: "mobile-chromium" }],
    },
    suites: [
      {
        title: "critical.spec.ts",
        file: "e2e/critical.spec.ts",
        line: 0,
        column: 0,
        specs: [],
        suites: [
          {
            title: "Critical deterministic gate",
            file: "e2e/critical.spec.ts",
            line: 1,
            column: 1,
            specs,
          },
        ],
      },
    ],
    errors: [],
    stats: {
      startTime: "2026-07-23T00:00:00.000Z",
      duration: 20,
      expected: expectedCount,
      skipped: 0,
      unexpected: 0,
      flaky: 0,
    },
  };
}

function assertSelfTestRejects(name, mutate, expectedMessage) {
  const report = passingReport();
  mutate(report);
  try {
    assertReport(report, 2);
  } catch (error) {
    if (error instanceof Error && expectedMessage.test(error.message)) {
      return;
    }
    throw new Error(
      `Self-test "${name}" failed with an unexpected error: ${String(error)}`,
    );
  }
  throw new Error(`Self-test "${name}" failed: invalid report was accepted.`);
}

if (process.argv[2] === "--self-test") {
  assertReport(passingReport(), 2);

  const rejectionCases = [
    [
      "missing suites",
      (report) => {
        delete report.suites;
      },
      /suites/,
    ],
    [
      "missing specs",
      (report) => {
        delete report.suites[0].suites[0].specs;
      },
      /specs/,
    ],
    [
      "missing tests",
      (report) => {
        delete report.suites[0].suites[0].specs[0].tests;
      },
      /tests/,
    ],
    [
      "invalid root errors",
      (report) => {
        report.errors = {};
      },
      /root errors/,
    ],
    [
      "root error",
      (report) => {
        report.errors.push({ message: "load failure" });
      },
      /root errors contains/,
    ],
    [
      "expected failure",
      (report) => {
        const test = report.suites[0].suites[0].specs[0].tests[0];
        test.expectedStatus = "failed";
        test.results[0].status = "failed";
      },
      /expectedStatus=failed/,
    ],
    [
      "failed final result",
      (report) => {
        const test = report.suites[0].suites[0].specs[0].tests[0];
        test.results[0].status = "failed";
      },
      /final result status=failed/,
    ],
    [
      "skipped aggregate",
      (report) => {
        report.stats.expected = 1;
        report.stats.skipped = 1;
      },
      /stats.expected=1/,
    ],
  ];

  for (const [name, mutate, expectedMessage] of rejectionCases) {
    assertSelfTestRejects(name, mutate, expectedMessage);
  }

  console.info(
    `Playwright coverage gate self-test: valid report accepted, ${rejectionCases.length} invalid reports rejected.`,
  );
  process.exit(0);
}

const reportPath = process.argv[2]?.endsWith(".json")
  ? process.argv[2]
  : "test-results/results.json";
const expectedCount = Number(
  process.argv[2]?.endsWith(".json") ? process.argv[3] : process.argv[2],
);

if (!Number.isInteger(expectedCount) || expectedCount < 1) {
  throw new Error(
    "Usage: node scripts/assert-playwright-results.mjs [report.json] <expected-count>",
  );
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
assertReport(report, expectedCount);

console.info(
  `Playwright coverage gate: ${expectedCount} expected, 0 skipped, 0 unexpected, 0 flaky.`,
);
