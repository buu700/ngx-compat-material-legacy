/** Finite native Trusted Types probe admission; no general CSP/G11 claim. */
export const PEER_ICON_TT_CSP = "require-trusted-types-for 'script'; trusted-types angular angular#components angular#unsafe-bypass angular#bundler";
const flags = ['available', 'svg_rendered', 'positive_without_violations',
  'raw_literal_rejected', 'disallowed_policy_rejected', 'negative_directives_observed'];
const directives = ['require-trusted-types-for', 'trusted-types'];
export function peerIconTtOkay(probe) {
  return Boolean(probe && !Array.isArray(probe) && flags.every(key => probe[key] === true)
    && Array.isArray(probe.observed_negative_directives)
    && directives.every(value => probe.observed_negative_directives.includes(value))
    && probe.observed_negative_directives.every(value => directives.includes(value)));
}
