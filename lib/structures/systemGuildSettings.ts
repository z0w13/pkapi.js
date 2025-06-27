import API from '../index';

import axios from 'axios';
import validUrl from 'valid-url';

const KEYS: any = {
	guild: { },
	proxying_enabled: {
		transform: (v?: any) => v ? true : false
	},
	tag: {
		test: (s?: string) => s!.length <= 79,
		err: 'Server tag must be 79 characters or less'
	},
	tag_enabled: {
		transform: (v?: any) => v ? true : false
	},
	avatar_url: {
		test: async (a: string) => {
			if(!validUrl.isWebUri(a)) return false;
			try {
				var data = await axios.head(a);
				if(data.headers["content-type"]?.startsWith("image")) return true;
				return false;
			} catch(e) { return false; }
		},
		err: "Avatar URL must be a valid image and less than 256 characters"
	},
	display_name: {
		test: (d: string) => !d.length || d.length <= 100,
		err: "Display name must be 100 characters or less"
	}
}

export interface ISystemGuildSettings {
	[key: string]: any;

	guild: string;
	proxying_enabled?: boolean;
	tag?: string | null;
	tag_enabled?: boolean;
	avatar_url?: string | null;
	display_name?: string | null;
}

export default class SystemGuildSettings implements ISystemGuildSettings {
	[key: string]: any;

	#api: API;

	guild = '';
	proxying_enabled?: boolean;
	tag?: string | null;
	tag_enabled?: boolean;
	avatar_url?: string | null;
	display_name?: string | null;

	constructor(api: API, data: Partial<SystemGuildSettings> = { }) {
		this.#api = api;
		for(var k in data) {
			if(KEYS[k]) {
				if(KEYS[k].init) data[k] = KEYS[k].init(data[k]);
				this[k] = data[k];
			}
		}
	}

	async patch(token?: string) {
		var data = await this.#api.patchSystemGuildSettings({...this, token});
		for(var k in data) if(KEYS[k]) this[k] = data[k];
		return this;
	}

	async verify() {
		var settings: Partial<SystemGuildSettings> = {};
		var errors = [];
		for(var k in KEYS) {
			var test = true;
			if(this[k] == null) {
				settings[k] = this[k];
				continue;
			}
			if(this[k] == undefined) continue;

			if(KEYS[k].test) test = await KEYS[k].test(this[k]);
			if(!test) {
				errors.push(KEYS[k].err);
				continue;
			}
			if(KEYS[k].transform) this[k] = KEYS[k].transform(this[k]);
			settings[k] = this[k];
		}

		if(errors.length) throw new Error(errors.join("\n"));

		return settings;
	}
}