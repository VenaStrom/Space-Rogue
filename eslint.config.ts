import { globalIgnores } from "eslint/config";
import browserConfig from "./eslint.browser.config";
import nodeConfig from "./eslint.node.config";
import { localPlugin } from "./eslint.rules";

export default [
	{ // Register the local plugin globally so commonRules can reference it in every block
		name: "Local rules",
		plugins: { local: localPlugin },
	},
	...browserConfig,
	...nodeConfig,
	globalIgnores([
		"node_modules",
		"dist",
	]),
];
