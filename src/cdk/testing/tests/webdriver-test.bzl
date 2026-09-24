load("//tools:defaults.bzl", "jasmine_node_test", "spec_bundle")
load("@io_bazel_rules_webtesting//web:web.bzl", "web_test")

# Historical e2e-app server retired 2026-09-23. Webdriver suite kept as manual
# jasmine+chromium targets only; server_test wrapper removed with //src/e2e-app.

def webdriver_test(name, deps, tags = [], **kwargs):
    spec_bundle(
        name = "%s_bundle" % name,
        deps = deps,
        platform = "node",
        external = ["selenium-webdriver"],
    )

    jasmine_node_test(
        name = "%s_jasmine_test" % name,
        tags = tags + ["manual"],
        deps = ["%s_bundle" % name, "@npm//selenium-webdriver"],
        **kwargs
    )

    web_test(
        name = "%s_chromium_web_test" % name,
        browser = "@npm//@angular/build-tooling/bazel/browsers/chromium:chromium",
        tags = tags + ["manual"],
        test = ":%s_jasmine_test" % name,
    )

    native.test_suite(
        name = name,
        tests = [
            ":%s_chromium_web_test" % name,
        ],
    )
