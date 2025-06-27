export interface RateLimitableItem {
  status?: string | number;
  headers?: unknown;
}
export default abstract class BaseRateLimiter {
  public abstract handleResponse(response: RateLimitableItem): Promise<void>;
  public abstract take(): Promise<void>;
}
