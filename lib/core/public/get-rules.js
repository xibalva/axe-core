import { getAudit } from '../base/audit';

/**
 * Searches and returns rules that contain a tag in the list of tags.
 * @param  {Array}   tags  Optional array of tags
 * @return {Array}  Array of rules
 */
function getRules(tags) {
	const audit = getAudit();

	tags = tags || [];
	const matchingRules = !tags.length
		? audit.rules
		: audit.rules.filter(function(item) {
				return !!tags.filter(function(tag) {
					return item.tags.indexOf(tag) !== -1;
				}).length;
		  });

	const ruleData = audit.data.rules || {};
	return matchingRules.map(function(matchingRule) {
		const rd = ruleData[matchingRule.id] || {};
		return {
			ruleId: matchingRule.id,
			description: rd.description,
			help: rd.help,
			helpUrl: rd.helpUrl,
			tags: matchingRule.tags
		};
	});
}

export default getRules;
