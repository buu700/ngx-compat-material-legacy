load("//:packages.bzl", "MDC_PACKAGES")

# Base list of externals which should not be bundled into the APF package output.
# Note that we want to disable sorting of the externals as we manually group entries.
# Upstream src/* entry-point expansion retired 2026-09-23; keep framework + peer
# package roots + MDC as static externals for any residual Bazel tooling.
# buildifier: disable=unsorted-list-items
PKG_EXTERNALS = [
    # Framework packages.
    "@angular/animations",
    "@angular/common",
    "@angular/common/http",
    "@angular/common/http/testing",
    "@angular/common/testing",
    "@angular/core",
    "@angular/core/testing",
    "@angular/forms",
    "@angular/platform-browser",
    "@angular/platform-browser-dynamic",
    "@angular/platform-browser-dynamic/testing",
    "@angular/platform-browser/animations",
    "@angular/platform-server",
    "@angular/router",

    # Peer package roots (published @angular/*; not built from this repo's src/).
    "@angular/cdk",
    "@angular/material",

    # Third-party libraries.
    "kagekiri",
    "moment",
    "moment/locale/fr",
    "moment/locale/ja",
    "luxon",
    "date-fns",
    "protractor",
    "rxjs",
    "rxjs/operators",
    "selenium-webdriver",

    # TODO: Remove slider deep dependencies after we remove depencies on MDC's javascript
    "@material/slider/adapter",
    "@material/slider/foundation",
    "@material/slider/types",
]

# Configures the externals for all MDC packages.
def setup_mdc_externals():
    for pkg_name in MDC_PACKAGES:
        PKG_EXTERNALS.append(pkg_name)

setup_mdc_externals()
