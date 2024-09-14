import * as sandbox from "./sandbox";
import * as seclangCore from "./seclangCore";

const NO_LIMITS: seclangCore.Limits = {
	maxInstructions: undefined,
	maxVariables: undefined,
};

export { sandbox, seclangCore, NO_LIMITS };
