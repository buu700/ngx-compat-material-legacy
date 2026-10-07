/** Copyright (c) 2026 Ryan Lester. MIT license. */

/** Capture native observer callbacks without importing CDK's private factory.
 * Jasmine restores the constructor spy after each spec. CDK ContentObserver
 * and cdkObserveContent still perform their actual filtering/subscription work.
 */
export function captureMutationObserverCallbacks(callbacks: Function[]): void {
  spyOn(window, 'MutationObserver').and.callFake(
    function (callback: MutationCallback): MutationObserver {
      callbacks.push(callback);
      return {observe: () => {}, disconnect: () => {}, takeRecords: () => []};
    },
  );
}
