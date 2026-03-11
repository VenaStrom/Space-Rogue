import { globalIgnores } from "eslint/config";
import browserConfig from "./eslint.browser.config";
import nodeConfig from "./eslint.node.config";

export default [
	...browserConfig,
	...nodeConfig,
	globalIgnores([
		"node_modules",
		"dist",
	]),
];
