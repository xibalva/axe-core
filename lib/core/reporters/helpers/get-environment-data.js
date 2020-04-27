import { getAudit } from '../../base/audit';
import { getVersion } from '../../version';

/**
 * Add information about the environment axe was run in.
 * @return {Object}
 */
function getEnvironmentData(win = window) {
	// TODO: remove parameter once we are testing axe-core in jsdom and other
	// supported environments
	const {
		screen = {},
		navigator = {},
		location = {},
		innerHeight,
		innerWidth
	} = win;
	const audit = getAudit();

	const orientation =
		screen.msOrientation || screen.orientation || screen.mozOrientation || {};

	return {
		testEngine: {
			name: 'axe-core',
			version: getVersion()
		},
		testRunner: {
			name: audit.brand
		},
		testEnvironment: {
			userAgent: navigator.userAgent,
			windowWidth: innerWidth,
			windowHeight: innerHeight,
			orientationAngle: orientation.angle,
			orientationType: orientation.type
		},
		timestamp: new Date().toISOString(),
		url: location.href
	};
}

export default getEnvironmentData;
