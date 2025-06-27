import API from '../index';

import Group from './group';
import MemberGuildSettings from './memberGuildSettings';

import tc, { Instance } from 'tinycolor2';
import validUrl from 'valid-url';
import axios from 'axios';
import * as chrono from 'chrono-node';
import {
	validatePrivacy,
	formatDate
} from '../utils';

const parser = chrono.casual.clone();
parser.refiners.push({
	refine: (ctx, res) => {
		res.forEach(r => {
			if(!r.start.isCertain('year')) r.start.assign('year', 2004)
		})

		return res;
	}
})

function hasKeys(obj: any, keys: Array<string>) {
	if(typeof obj !== "object") return false;
	var okeys = Object.keys(obj);

	for(var k of keys) if(!okeys.includes(k)) return false;

	return true;
}

const enum MemberPrivacyKeys {
	Visibility = 	'visibility',
	Name = 			'name_privacy',
	Description = 	'description_privacy',
	Birthday = 		'birthday_privacy',
	Pronouns = 		'pronoun_privacy',
	Avatar = 		'avatar_privacy',
	Metadata = 		'metadata_privacy',
	Proxy = 		'proxy_privacy'
}

const pKeys = [
	MemberPrivacyKeys.Visibility,
	MemberPrivacyKeys.Name,
	MemberPrivacyKeys.Description,
	MemberPrivacyKeys.Birthday,
	MemberPrivacyKeys.Pronouns,
	MemberPrivacyKeys.Avatar,
	MemberPrivacyKeys.Metadata,
	MemberPrivacyKeys.Proxy
]

export interface MemberPrivacy {
	visibility?: string | null;
	name_privacy?: string | null;
	description_privacy?: string | null;
	birthday_privacy?: string | null;
	pronoun_privacy?: string | null;
	avatar_privacy?: string | null;
	metadata_privacy?: string | null;
	proxy_privacy?: string | null;
}

const KEYS: any = {
	id: { },
	uuid: { },
	system: { },
	name: {
		test: (n: string) => n.length && n.length <= 100,
		err: "Name must be 100 characters or less",
		required: true
	},
	display_name: {
		test: (d: string) => !d.length || d.length <= 100,
		err: "Display name must be 100 characters or less"
	},
	color: {
		test: (c: string | Instance) => { c = tc(c); return c.isValid() },
		err: "Color must be a valid hex code",
		transform: (c: string | Instance) => { c = tc(c); return c.toHex() }
	},
	birthday: {
		test: (d: string | Date) => {
			if(d instanceof Date) return true;
			else {
				var d2 = parser.parseDate(d);
				return d2 && !isNaN(d2.valueOf())
			}
		},
		err: "Birthday must be a valid date",
		transform: (d: string | Date) => {
			if(!d) return d;
			var date;
			if(!(d instanceof Date)) date = parser.parseDate(d);
			else date = d;
			return formatDate(date!);
		},
		init: (d: string | Date) => d ? new Date(d) : d
	},
	pronouns: {
		test: (p: string) => !p.length || p.length <= 100,
		err: "Pronouns must be 100 characters or less"
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
	webhook_avatar_url: {
		test: async (a: string) => {
			if(!validUrl.isWebUri(a)) return false;
			try {
				var data = await axios.head(a);
				if(data.headers["content-type"]?.startsWith("image")) return true;
				return false;
			} catch(e) { return false; }
		},
		err: "Webhook avatar URL must be a valid image and less than 256 characters"
	},
	banner: {
		test: async (a: string) => {
			if(!validUrl.isWebUri(a)) return false;
			try {
				var data = await axios.head(a);
				if(data.headers["content-type"]?.startsWith("image")) return true;
				return false;
			} catch(e) { return false; }
		},
		err: "Banner URL must be a valid image and less than 256 characters"
	},
	description: {
		test: (d: string) => !d.length || d.length < 1000,
		err: "Description must be 1000 characters or less"
	},
	created: {
		init: (d: string | Date) => new Date(d)
	},
	proxy_tags: {
		test: (p: ProxyTag[]) => Array.isArray(p) && !p.some(t => !hasKeys(t, ['prefix', 'suffix']) || `${t.prefix}text${t.suffix}`.length > 100),
		err: "Proxy tags must be an array of objects containing 'prefix' and 'suffix' keys, and the combined prefix + 'text' + suffix must be less than 100 characters"
	},
	keep_proxy: {
		test: (v: any) => typeof v == "boolean",
		err: "Keep proxy must be a boolean (true or false)"
	},
	tts: {
		test: (v: any) => typeof v == "boolean",
		err: "TTS must be a boolean (true or false)"
	},
	autoproxy_enabled: {
		test: (v: any) => typeof v == "boolean",
		err: "Autoproxy status must be a boolean (true or false)"
	},
	message_count: { },
	last_message_timestamp: {
		init: (d: string | Date) => d ? new Date(d) : d
	},
	privacy: {
		transform: (o: Partial<MemberPrivacy>) => validatePrivacy(pKeys, o)
	}
}

export interface ProxyTag {
	prefix?: string;
	suffix?: string;
}

export interface IMember {
	id: string;
	uuid: string;
	system?: string;
	name: string;
	display_name?: string | null;
	color?: string | null;
	birthday?: Date | string | null;
	pronouns?: string | null;
	avatar_url?: string | null;
	webhook_avatar_url?: string | null;
	banner?: string | null;
	description?: string | null;
	created: Date | string;
	proxy_tags?: ProxyTag[];
	keep_proxy?: boolean;
	tts?: boolean;
	autoproxy_enabled?: boolean;
	message_count?: number;
	last_message_timestamp?: Date;
	privacy: MemberPrivacy;

	groups?: Map<string, Group>;
	settings?: Map<string, MemberGuildSettings>;
}

export default class Member implements IMember {
	[key: string]: any;

	#api: API;

	id: string = '';
	uuid: string = '';
	system?: string;
	name: string = '';
	display_name?: string | null;
	color?: string | null;
	birthday?: Date | string | null;
	pronouns?: string | null;
	avatar_url?: string | null;
	webhook_avatar_url?: string | null;
	banner?: string | null;
	description?: string | null;
	created: Date | string = '';
	proxy_tags?: ProxyTag[];
	keep_proxy?: boolean;
	tts?: boolean;
	autoproxy_enabled?: boolean;
	message_count?: number;
	last_message_timestamp?: Date;
	privacy: MemberPrivacy = {};

	groups?: Map<string, Group>;
	settings?: Map<string, MemberGuildSettings>;

	constructor(api: API, data: Partial<Member>) {
		this.#api = api;
		for(var k in data) {
			if(KEYS[k]) {
				if(KEYS[k].init) data[k] = KEYS[k].init(data[k]);
				this[k] = data[k];
			}
		}
	}

	async patch(token?: string) {
		var data = await this.#api.patchMember({member: this.id, ...this, token});
		for(var k in data) if(KEYS[k]) this[k] = data[k];
		return this;
	}

	async delete(token?: string) {
		return await this.#api.deleteMember({member: this.id, token});
	}

	async getGroups(token?: string) {
		var groups = await this.#api.getMemberGroups({member: this.id, token});
		this.groups = groups;
		return groups;
	}

	async addGroups(groups: Array<string>, token?: string) {
		await this.#api.addMemberGroups({member: this.id, groups, token});
		var grps = await this.getGroups(token);
		this.groups = grps;
		return grps;
	}

	async removeGroups(groups: Array<string>, token?: string) {
		await this.#api.removeMemberGroups({member: this.id, groups, token});
		var grps = await this.getGroups(token);
		this.groups = grps;
		return grps;
	}

	async setGroups(groups: Array<string>, token?: string) {
		await this.#api.setMemberGroups({member: this.id, groups, token});
		var grps = await this.getGroups(token);
		this.groups = grps;
		return grps;
	}

	async getGuildSettings(guild: string, token?: string) {
		var settings = await this.#api.getMemberGuildSettings({member: this.id, guild, token});
		if(!this.settings) this.settings = new Map();
		this.settings.set(guild, settings);
		return settings;
	}

	async verify() {
		var mem: Partial<Member> = {};
		var errors = [];
		for(var k in KEYS) {
			if(KEYS[k].required && !this[k]) {
				errors.push(`Key ${k} is required, but wasn't supplied`);
				continue;
			}

			if(this[k] == null) {
				mem[k] = this[k];
				continue;
			}
			if(this[k] == undefined) continue;

			var test = true;
			if(KEYS[k].test) test = await KEYS[k].test(this[k]);
			if(!test) {
				errors.push(KEYS[k].err);
			}
			if(KEYS[k].transform) this[k] = KEYS[k].transform(this[k]);
			mem[k] = this[k];
		}

		if(errors.length) throw new Error(errors.join("\n"));

		return mem;
	}
}