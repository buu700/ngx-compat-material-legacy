# Security-deep heuristic leads (not dispositions)

These SHAs matched crude security/CSP/XSS/Trusted Types heuristics. Each still needs individual deep review and an inherited-in-peer-22.1.7 proof before any release claim.

- `b423c0e0b754b1f1d118d17e022981c357c3aa68` — fix(material/datepicker): deprecate constructor injection in NativeDateAdapter (#26144)
- `cf3506adf1af1556d705dbb651e7e96a7141b81d` — fix(material/progress-bar): avoid CSP issues for apps not using buffer mode (#28946)
- `622152de761b629a426b744ec2ff3e4e79d18889` — perf(material/tooltip): Defer injection of injectables not needed until tooltip is shown. (#30440)
- `878700d10ab042b6a62c6f86f4fcc24d5a0ae685` — fix(material/progress-bar): avoid CSP issues due to buffer dots (#31818)
- `1d42431b2fe745602727eda03338c80c8897850a` — refactor: move trusted types logic into CDK (#32387)
- `231f94f5557bb58afc0070585688b3014d541eb2` — fix(cdk/layout): avoid CSS injection attacks in media matcher
