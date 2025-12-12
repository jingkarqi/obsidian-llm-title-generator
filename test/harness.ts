type TestFn = () => void | Promise<void>;

type TestCase = {
	name: string;
	fn: TestFn;
};

type BeforeEachFn = () => void | Promise<void>;

const tests: TestCase[] = [];
const beforeEachHooks: BeforeEachFn[] = [];
const suiteStack: string[] = [];

type MockCall = {
	arguments: unknown[];
	result: unknown;
	error: unknown;
};

type MockFn<TArgs extends unknown[] = unknown[], TResult = unknown> = ((...args: TArgs) => TResult) & {
	mock: {
		calls: MockCall[];
		callCount(): number;
	};
};

const allMocks = new Set<MockFn>();

export const mock = {
	fn<TArgs extends unknown[] = unknown[], TResult = unknown>(impl?: (...args: TArgs) => TResult): MockFn<TArgs, TResult> {
		const calls: MockCall[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const f: any = (...args: TArgs) => {
			try {
				const result = (impl ?? (() => undefined as unknown as TResult))(...args);
				calls.push({ arguments: args, result, error: undefined });
				return result;
			} catch (err) {
				calls.push({ arguments: args, result: undefined, error: err });
				throw err;
			}
		};

		f.mock = {
			calls,
			callCount: () => calls.length,
		};

		allMocks.add(f);
		return f as MockFn<TArgs, TResult>;
	},

	reset() {
		for (const f of allMocks) {
			f.mock.calls.length = 0;
		}
	},
};

export function beforeEach(fn: BeforeEachFn) {
	beforeEachHooks.push(fn);
}

export function describe(name: string, fn: () => void) {
	suiteStack.push(name);
	try {
		fn();
	} finally {
		suiteStack.pop();
	}
}

export function it(name: string, fn: TestFn) {
	const fullName = [...suiteStack, name].join(" > ");
	tests.push({ name: fullName, fn });
}

export async function run() {
	let passed = 0;
	let failed = 0;

	for (const t of tests) {
		try {
			for (const hook of beforeEachHooks) {
				await hook();
			}
			await t.fn();
			passed++;
			process.stdout.write(`ok - ${t.name}\n`);
		} catch (err) {
			failed++;
			process.stderr.write(`not ok - ${t.name}\n`);
			process.stderr.write(`${String(err)}\n`);
		}
	}

	process.stdout.write(`\n# pass ${passed}\n`);
	process.stdout.write(`# fail ${failed}\n`);
	if (failed > 0) process.exitCode = 1;
}

