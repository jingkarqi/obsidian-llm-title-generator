import { beforeEach, mock } from "./harness";
import { __clearNotices, __resetRequestUrlMock } from "./__mocks__/obsidian";

// Some plugin code uses `window.setTimeout`. In Node, map `window` to the global.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = globalThis;

beforeEach(() => {
	mock.reset();
	__clearNotices();
	__resetRequestUrlMock();
});
