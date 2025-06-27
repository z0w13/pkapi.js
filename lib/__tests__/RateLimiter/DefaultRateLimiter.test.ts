import DefaultRateLimiter from '../../RateLimiter/DefaultRateLimiter';
import { jest, describe, expect, it } from '@jest/globals';
import PKAPI, { APIError } from '../..';

class TestRateLimiter extends DefaultRateLimiter {
  public setErrorTimestamps(timestamps: Array<number>) {
    this.errorTimestamps = timestamps;
  }

  public async triggerError() {
    return this.handleResponse(
      new APIError(new PKAPI(), {
        status: '429',
      }),
    );
  }
}

describe('RateLimiter', function () {
  it('increases the wait time if we exceed the max error threshold', function () {
    const limiter = new TestRateLimiter();

    limiter.triggerError();
    limiter.triggerError();
    limiter.triggerError();

    expect(limiter.getWaitTime()).toBe(1.5);
  });
  it('decreases the wait time if we drop below the min threshold', function () {
    const limiter = new TestRateLimiter(5000, 2);

    limiter.setErrorTimestamps([0, 1, 2]);
    limiter.handleResponse({
      status: '200',
    });

    expect(limiter.getWaitTime()).toBe(1.5);
  });
  it("waits if there's no remaining requests", async function () {
    jest.useFakeTimers();

    const limiter = new TestRateLimiter(5000, 1);
    // trigger the ratelimiter by setting remaining requests to 0
    limiter
      .handleResponse({
        status: '200',
        headers: { 'x-ratelimit-remaining': '0' },
      })

    // set done to true after the wait time
    let done = false;
    const limiterPromise = limiter.take().then(() => (done = true));
    // make sure the short circuit case resolves, so we can test correctly
    await jest.advanceTimersByTimeAsync(0)

    expect(done).toBe(false);
    jest.runAllTimers(); // run the timers
    await limiterPromise; // wait for the promise
    expect(done).toBe(true);
  });
  it('waits if a rate limit error was triggered', async function () {
    jest.useFakeTimers();

    const limiter = new TestRateLimiter(5000, 0.1, 0.1);
    // trigger an error to ratelimit the next request
    limiter.triggerError()

    // set done to true after waiting
    let done = false;
    const limiterPromise = limiter.take().then(() => (done = true));
    // make sure the short circuit case resolves, so we can test correctly
    await jest.advanceTimersByTimeAsync(0)

    expect(done).toBe(false);
    jest.runAllTimers(); // run the timers
    await limiterPromise; // wait for the promise
    expect(done).toBe(true);
  });
});
