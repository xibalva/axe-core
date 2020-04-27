import { getAudit } from '../base/audit';

function reset() {
	var audit = getAudit();

	if (!audit) {
		throw new Error('No audit configured');
	}
	audit.resetRulesAndChecks();
}

export default reset;
