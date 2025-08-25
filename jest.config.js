/** @type {import('jest').Config} */
export default {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	collectCoverageFrom: ["src/**/*.ts", "!src/index.ts"],
};
