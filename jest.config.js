/** @type {import('jest').Config} */
export default {
	preset: "ts-jest/presets/default-esm",
	extensionsToTreatAsEsm: [".ts"],
	transform: {
		"^.+\\.tsx?$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
	testEnvironment: "node",
	collectCoverageFrom: [
		"src/**/*.{ts,js}",
		"!src/**/*.d.ts",
		"!src/index.ts", // Skip main entry point for coverage
	],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html"],
	testMatch: ["**/__tests__/**/*.{ts,js}", "**/?(*.)+(spec|test).{ts,js}"],
};
