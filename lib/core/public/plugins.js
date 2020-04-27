import { getAudit } from '../base/audit';
import { queue } from '../utils';

export const plugins = {};

export function cleanupPlugins() {
	for (let id in plugins) {
		delete plugins[id];
	}
}

class Plugin {
	constructor(spec) {
		const audit = getAudit();

		this._run = spec.run;
		this._collect = spec.collect;
		this._registry = {};
		spec.commands.forEach(function(command) {
			audit.registerCommand(command);
		});
	}

	run() {
		return this._run.apply(this, arguments);
	}

	collect() {
		return this._collect.apply(this, arguments);
	}

	cleanup(done) {
		const q = queue();
		Object.keys(this._registry).forEach(key => {
			q.defer(done => {
				this._registry[key].cleanup(done);
			});
		});
		q.then(function() {
			done();
		});
	}

	add(impl) {
		this._registry[impl.id] = impl;
	}
}

function registerPlugin(plugin) {
	plugins[plugin.id] = new Plugin(plugin);
}

export default registerPlugin;
