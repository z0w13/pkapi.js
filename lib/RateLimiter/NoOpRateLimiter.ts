import BaseRateLimiter, { RateLimitableItem } from "./BaseRateLimiter";

export default class NoOpRateLimiter extends BaseRateLimiter {
	public async handleResponse(_response: RateLimitableItem) {}
	public async take() {}
}
