/**
 * Reviewed case roster and pure assessment for companion-computed-styles.
 *
 * Every case is one companion x dimension x consuming element x computed
 * property. The consuming element and property come from the current peer
 * component stylesheet rule that reads the token (reviewed below, and checked
 * against the installed peer's component styles by tests). A case is rostered
 * only when the installed @angular/material peer's own M2 dimension mixin
 * (`mat.<companion>-<dimension>`) emits its token. A companion dimension for
 * which the peer emits no token at all becomes a `not-applicable` case whose
 * assertion records the peer evidence; it is never silently omitted.
 *
 * No browser is needed in this module. The producer
 * (check-companion-computed-styles.mjs) renders the peer components in
 * Chromium, themes the SAME DOM with the peer's M2 theme mixins (oracle) and
 * with the candidate bridges, and feeds the observations to assessCase().
 */
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, realpathSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {SCENARIOS as TOKEN_SCENARIOS} from './companion-bridge-peer-oracle.mjs';
const RICH_THEMES = TOKEN_SCENARIOS.filter(theme => theme.customTypography);
export const RICH_THEME_IDS = RICH_THEMES.map(theme => theme.id);

export const CHECK_ID = 'companion-computed-styles';
export const PEER_PACKAGE = '@angular/material';
export const COMPANIONS = [
  'badge', 'bottom-sheet', 'button-toggle', 'datepicker', 'divider', 'expansion',
  'grid-list', 'icon', 'sidenav', 'stepper', 'sort', 'toolbar', 'tree',
];
export const DIMENSIONS = ['base', 'color', 'typography', 'density'];
export const GROUP_DIMENSIONS = 'thirteen-companion-dimensions';
export const GROUP_ORACLE = 'independent-peer-oracle';

/**
 * Theme inputs. Oracle and candidate receive the same palettes, theme type,
 * typography and density through their own constructors: the peer's
 * `m2-define-*` functions for the oracle, the legacy facade's historical
 * `define-*` functions for the candidate.
 */
export const THEMES = {
  light: {type: 'light', typography: 'legacy', density: 0},
  dark: {type: 'dark', typography: 'legacy', density: 0},
  dense: {type: 'light', typography: 'legacy', density: -2},
  type: {type: 'light', typography: 'alternate', density: 0},
  ...Object.fromEntries(RICH_THEMES.map(theme => [theme.id, theme])),
};
export const PALETTES = {
  primary: ['indigo'],
  accent: ['pink', 'A200', 'A100', 'A400'],
  warn: ['red'],
};
export const ALTERNATE_FONT_FAMILY = 'Georgia, serif';

/**
 * Observation scenarios. `outer` themes the in-tree root, `inner` a nested
 * wrapper around every in-tree fixture, `overlay` the CDK overlay container
 * that hosts the datepicker popups and the bottom sheet (body overlays).
 */
export const SCENARIOS = {
  light: {outer: 'light', inner: 'light', overlay: 'light', dir: 'ltr', viewport: 'wide'},
  dark: {outer: 'dark', inner: 'dark', overlay: 'dark', dir: 'ltr', viewport: 'wide'},
  dense: {outer: 'dense', inner: 'dense', overlay: 'dense', dir: 'ltr', viewport: 'wide'},
  typography: {outer: 'type', inner: 'type', overlay: 'type', dir: 'ltr', viewport: 'wide'},
  rtl: {outer: 'light', inner: 'light', overlay: 'light', dir: 'rtl', viewport: 'wide'},
  nested: {outer: 'light', inner: 'dark', overlay: 'dark', dir: 'ltr', viewport: 'wide'},
  'narrow-light': {outer: 'light', inner: 'light', overlay: 'light', dir: 'ltr', viewport: 'narrow'},
  'narrow-dense': {outer: 'dense', inner: 'dense', overlay: 'dense', dir: 'ltr', viewport: 'narrow'},
  ...Object.fromEntries(RICH_THEME_IDS.flatMap(id => [
    [id, {outer:id,inner:id,overlay:id,dir:'ltr',viewport:'wide'}],
    ['narrow-'+id, {outer:id,inner:id,overlay:id,dir:'ltr',viewport:'narrow'}],
  ])),
  ...Object.fromEntries(['2018','legacy'].map(typography => {
    const light=`closeout-custom-${typography}-light`,dark=`closeout-custom-${typography}-dark`;
    return ['nested-custom-'+typography,{outer:light,inner:dark,overlay:dark,dir:'ltr',viewport:'wide'}];
  })),
};
export const DEFAULT_SCENARIOS = ['light', 'dark', 'dense', 'typography', 'rtl', 'nested', ...RICH_THEME_IDS, 'nested-custom-2018', 'nested-custom-legacy'];
export const NEGATIVE_SCENARIO = 'light';

/** Which scenario pair must move the oracle for a dimension (oracle sensitivity). */
export const SENSITIVITY = {
  color: ['light', 'dark'],
  typography: ['light', 'typography'],
  density: ['light', 'dense'],
};

const m = (companion) => (key) => `--mat-${companion}-${key}`;
const BINDINGS_RAW = [];
function bind(companion, dimension, element, property, token, locate, extra = {}) {
  BINDINGS_RAW.push({companion, dimension, element, property, token, locate, ...extra});
}

// ---------------------------------------------------------------- badge
{
  const t = m('badge');
  const c = (id) => ({css: `#${id} .mat-badge-content`});
  for (const [element, id] of [['content', 'ccs-badge'], ['content-accent', 'ccs-badge-accent'], ['content-warn', 'ccs-badge-warn']]) {
    bind('badge', 'color', element, 'background-color', t('background-color'), c(id));
    bind('badge', 'color', element, 'color', t('text-color'), c(id));
  }
  bind('badge', 'color', 'content-disabled', 'background-color', t('disabled-state-background-color'), c('ccs-badge-disabled'));
  bind('badge', 'color', 'content-disabled', 'color', t('disabled-state-text-color'), c('ccs-badge-disabled'));
  bind('badge', 'typography', 'content', 'font-family', t('text-font'), c('ccs-badge'));
  bind('badge', 'typography', 'content', 'font-weight', t('text-weight'), c('ccs-badge'));
  bind('badge', 'typography', 'content', 'font-size', t('text-size'), c('ccs-badge'));
  bind('badge', 'typography', 'content', 'line-height', t('line-height'), c('ccs-badge'));
  bind('badge', 'typography', 'content-small', 'font-size', t('small-size-text-size'), c('ccs-badge-small'));
  bind('badge', 'typography', 'content-small', 'line-height', t('small-size-line-height'), c('ccs-badge-small'));
  bind('badge', 'typography', 'content-large', 'font-size', t('large-size-text-size'), c('ccs-badge-large'));
  bind('badge', 'typography', 'content-large', 'line-height', t('large-size-line-height'), c('ccs-badge-large'));
  bind('badge', 'base', 'content', 'border-top-left-radius', t('container-shape'), c('ccs-badge'));
  for (const [size, id, prefix] of [['', 'ccs-badge', ''], ['-small', 'ccs-badge-small', 'small-size-'], ['-large', 'ccs-badge-large', 'large-size-']]) {
    const legacy = size ? `legacy-${prefix}container-size` : 'legacy-container-size';
    bind('badge', 'base', `content${size}`, 'width', t(legacy), c(id));
    bind('badge', 'base', `content${size}`, 'min-width', t(`${prefix}container-size`), c(id));
    bind('badge', 'base', `content${size}`, 'margin-top', t(`${prefix}container-offset`), c(id));
    bind('badge', 'base', `content${size}`, 'padding-left', t(`${prefix}container-padding`), c(id));
    bind('badge', 'base', `content${size}-overlap`, 'margin-top', t(`${prefix}container-overlap-offset`), c(`${id}-overlap`));
  }
}

// ---------------------------------------------------------------- bottom-sheet (body overlay)
{
  const t = m('bottom-sheet');
  const sheet = {css: '.ccs-sheet-panel .mat-bottom-sheet-container', overlay: true};
  bind('bottom-sheet', 'color', 'container', 'background-color', t('container-background-color'), sheet);
  bind('bottom-sheet', 'color', 'container', 'color', t('container-text-color'), sheet);
  bind('bottom-sheet', 'typography', 'container', 'font-family', t('container-text-font'), sheet);
  bind('bottom-sheet', 'typography', 'container', 'font-size', t('container-text-size'), sheet);
  bind('bottom-sheet', 'typography', 'container', 'line-height', t('container-text-line-height'), sheet);
  bind('bottom-sheet', 'typography', 'container', 'font-weight', t('container-text-weight'), sheet);
  bind('bottom-sheet', 'typography', 'container', 'letter-spacing', t('container-text-tracking'), sheet);
  bind('bottom-sheet', 'base', 'container', 'border-top-left-radius', t('container-shape'), sheet);
}

// ---------------------------------------------------------------- button-toggle
{
  const t = m('button-toggle');
  const host = (id) => ({css: `#${id}`});
  const overlay = (id) => ({css: `#${id} .mat-button-toggle-focus-overlay`});
  const label = (id) => ({css: `#${id} .mat-button-toggle-label-content`});
  bind('button-toggle', 'color', 'toggle', 'color', t('text-color'), host('ccs-toggle-plain'));
  bind('button-toggle', 'color', 'toggle', 'background-color', t('background-color'), host('ccs-toggle-plain'));
  bind('button-toggle', 'color', 'toggle-checked', 'color', t('selected-state-text-color'), host('ccs-toggle-checked'));
  bind('button-toggle', 'color', 'toggle-checked', 'background-color', t('selected-state-background-color'), host('ccs-toggle-checked'));
  bind('button-toggle', 'color', 'toggle-disabled', 'color', t('disabled-state-text-color'), host('ccs-toggle-disabled'));
  bind('button-toggle', 'color', 'toggle-disabled', 'background-color', t('disabled-state-background-color'), host('ccs-toggle-disabled'));
  bind('button-toggle', 'color', 'toggle-disabled-checked', 'color', t('disabled-selected-state-text-color'), host('ccs-toggle-disabled-checked'));
  bind('button-toggle', 'color', 'toggle-disabled-checked', 'background-color', t('disabled-selected-state-background-color'), host('ccs-toggle-disabled-checked'));
  bind('button-toggle', 'color', 'group', 'border-top-color', t('divider-color'), host('ccs-toggle-group'));
  bind('button-toggle', 'color', 'toggle-focus-overlay', 'background-color', t('state-layer-color'), overlay('ccs-toggle-plain'));
  bind('button-toggle', 'base', 'group', 'border-top-left-radius', t('shape'), host('ccs-toggle-group'));
  bind('button-toggle', 'base', 'toggle-hover-overlay', 'opacity', t('hover-state-layer-opacity'), overlay('ccs-toggle-hover'), {hover: '#ccs-toggle-hover'});
  bind('button-toggle', 'base', 'toggle-focus-overlay', 'opacity', t('focus-state-layer-opacity'), overlay('ccs-toggle-focus'));
  for (const [prop, key] of [['font-family', 'label-text-font'], ['font-size', 'label-text-size'], ['line-height', 'label-text-line-height'], ['font-weight', 'label-text-weight'], ['letter-spacing', 'label-text-tracking']]) {
    bind('button-toggle', 'typography', 'toggle', prop, t(key), host('ccs-toggle-plain'));
    bind('button-toggle', 'typography', 'legacy-toggle', prop, t(`legacy-${key}`), host('ccs-legacy-toggle-plain'));
  }
  bind('button-toggle', 'density', 'toggle-label', 'line-height', t('height'), label('ccs-toggle-plain'));
  // appearance="legacy" toggles consume the peer's legacy-* tokens.
  bind('button-toggle', 'color', 'legacy-toggle', 'color', t('legacy-text-color'), host('ccs-legacy-toggle-plain'));
  bind('button-toggle', 'color', 'legacy-toggle-checked', 'color', t('legacy-selected-state-text-color'), host('ccs-legacy-toggle-checked'));
  bind('button-toggle', 'color', 'legacy-toggle-checked', 'background-color', t('legacy-selected-state-background-color'), host('ccs-legacy-toggle-checked'));
  bind('button-toggle', 'color', 'legacy-toggle-disabled', 'color', t('legacy-disabled-state-text-color'), host('ccs-legacy-toggle-disabled'));
  bind('button-toggle', 'color', 'legacy-toggle-disabled', 'background-color', t('legacy-disabled-state-background-color'), host('ccs-legacy-toggle-disabled'));
  bind('button-toggle', 'color', 'legacy-toggle-disabled-checked', 'background-color', t('legacy-disabled-selected-state-background-color'), host('ccs-legacy-toggle-disabled-checked'));
  bind('button-toggle', 'color', 'legacy-toggle-focus-overlay', 'background-color', t('legacy-state-layer-color'), overlay('ccs-legacy-toggle-plain'));
  bind('button-toggle', 'base', 'legacy-group', 'border-top-left-radius', t('legacy-shape'), host('ccs-legacy-toggle-group'));
  bind('button-toggle', 'base', 'legacy-toggle-label', 'line-height', t('legacy-height'), label('ccs-legacy-toggle-plain'));
  bind('button-toggle', 'base', 'legacy-toggle-focus-overlay', 'opacity', t('legacy-focus-state-layer-opacity'), overlay('ccs-legacy-toggle-focus'));
}

// ---------------------------------------------------------------- datepicker (popup overlays + in-tree)
{
  const t = m('datepicker');
  // panelClass lands on the popup's <mat-calendar>, inside .mat-datepicker-content.
  const popCss = (panel, sub) => (sub === '.mat-datepicker-content' ? `.mat-datepicker-content:has(.mat-calendar.${panel})`
    : sub === '.mat-calendar' ? `.mat-calendar.${panel}` : `.mat-calendar.${panel} ${sub}`);
  const pop = (panel, sub) => ({css: popCss(panel, sub), overlay: true});
  const day = (panel, which, sub, extra = {}) => ({css: `.mat-calendar.${panel}`, day: which, sub, overlay: true, ...extra});
  const cal = (id, which, sub, extra = {}) => ({css: `#${id}`, day: which, sub, ...extra});
  const content = '.mat-calendar-body-cell-content';
  bind('datepicker', 'color', 'popup', 'background-color', t('calendar-container-background-color'), pop('ccs-dp-primary', '.mat-datepicker-content'));
  bind('datepicker', 'color', 'popup', 'color', t('calendar-container-text-color'), pop('ccs-dp-primary', '.mat-datepicker-content'));
  bind('datepicker', 'base', 'popup', 'border-top-left-radius', t('calendar-container-shape'), pop('ccs-dp-primary', '.mat-datepicker-content'));
  bind('datepicker', 'base', 'popup', 'box-shadow', t('calendar-container-elevation-shadow'), pop('ccs-dp-primary', '.mat-datepicker-content'));
  bind('datepicker', 'base', 'popup-touch', 'border-top-left-radius', t('calendar-container-touch-shape'), pop('ccs-dp-touch', '.mat-datepicker-content'));
  bind('datepicker', 'base', 'popup-touch', 'box-shadow', t('calendar-container-touch-elevation-shadow'), pop('ccs-dp-touch', '.mat-datepicker-content'));
  for (const [variant, panel] of [['', 'ccs-dp-primary'], ['-accent', 'ccs-dp-accent'], ['-warn', 'ccs-dp-warn']]) {
    bind('datepicker', 'color', `popup${variant}-selected-today`, 'background-color', t('calendar-date-selected-state-background-color'), day(panel, 'today', content));
    bind('datepicker', 'color', `popup${variant}-selected-today`, 'color', t('calendar-date-selected-state-text-color'), day(panel, 'today', content));
    // The token is a color inside `box-shadow: inset 0 0 0 1px <token>`: a color sentinel.
    bind('datepicker', 'color', `popup${variant}-selected-today`, 'box-shadow', t('calendar-date-today-selected-state-outline-color'), day(panel, 'today', content), {sentinel_kind: 'color'});
  }
  bind('datepicker', 'color', 'popup-date', 'color', t('calendar-date-text-color'), day('ccs-dp-primary', 'plain', content));
  bind('datepicker', 'color', 'popup-date', 'border-top-color', t('calendar-date-outline-color'), day('ccs-dp-primary', 'plain', content));
  bind('datepicker', 'color', 'popup-date-disabled', 'color', t('calendar-date-disabled-state-text-color'), day('ccs-dp-primary', 'filtered', content));
  bind('datepicker', 'color', 'popup-body-label', 'color', t('calendar-body-label-text-color'), pop('ccs-dp-primary', '.mat-calendar-body-label'));
  bind('datepicker', 'color', 'popup-header-cell', 'color', t('calendar-header-text-color'), pop('ccs-dp-primary', '.mat-calendar-table-header th'));
  bind('datepicker', 'color', 'popup-header-divider', 'background-color', t('calendar-header-divider-color'), {...pop('ccs-dp-primary', '.mat-calendar-table-header-divider'), pseudo: '::after'});
  bind('datepicker', 'color', 'popup-period-button', 'color', t('calendar-period-button-text-color'), pop('ccs-dp-primary', '.mat-calendar-period-button'));
  bind('datepicker', 'color', 'popup-period-arrow', 'fill', t('calendar-period-button-icon-color'), pop('ccs-dp-primary', '.mat-calendar-arrow'));
  bind('datepicker', 'color', 'popup-next-button', 'color', t('calendar-navigation-button-icon-color'), pop('ccs-dp-primary', '.mat-calendar-next-button'));
  bind('datepicker', 'color', 'toggle-active', 'color', t('toggle-active-state-icon-color'), {css: '#ccs-dp-toggle-primary'});
  bind('datepicker', 'color', 'toggle-active-accent', 'color', t('toggle-active-state-icon-color'), {css: '#ccs-dp-toggle-accent'});
  bind('datepicker', 'color', 'toggle-active-warn', 'color', t('toggle-active-state-icon-color'), {css: '#ccs-dp-toggle-warn'});
  bind('datepicker', 'color', 'toggle', 'color', t('toggle-icon-color'), {css: '#ccs-dp-toggle-idle'});
  bind('datepicker', 'color', 'range-separator', 'color', t('range-input-separator-color'), {css: '#ccs-dp-range .mat-date-range-input-separator'});
  bind('datepicker', 'color', 'range-separator-disabled', 'color', t('range-input-disabled-state-separator-color'), {css: '#ccs-dp-range-disabled .mat-date-range-input-separator'});
  bind('datepicker', 'color', 'range-input-disabled', 'color', t('range-input-disabled-state-text-color'), {css: '#ccs-dp-range-disabled .mat-date-range-input-inner'});
  bind('datepicker', 'color', 'calendar-in-range', 'background-color', t('calendar-date-in-range-state-background-color'), {...cal('ccs-cal-range', 7, null), pseudo: '::before'});
  bind('datepicker', 'color', 'calendar-in-comparison-range', 'background-color', t('calendar-date-in-comparison-range-state-background-color'), {...cal('ccs-cal-range', 15, null), pseudo: '::before'});
  bind('datepicker', 'color', 'calendar-in-overlap-range', 'background-color', t('calendar-date-in-overlap-range-state-background-color'), {...cal('ccs-cal-range', 11, null), pseudo: '::after'});
  bind('datepicker', 'color', 'calendar-in-overlap-range-selected', 'background-color', t('calendar-date-in-overlap-range-selected-state-background-color'), cal('ccs-cal-range', 12, content));
  bind('datepicker', 'color', 'calendar-focused-date', 'background-color', t('calendar-date-focus-state-background-color'), cal('ccs-cal-focus', 'today', content));
  bind('datepicker', 'color', 'calendar-today', 'border-top-color', t('calendar-date-today-outline-color'), cal('ccs-cal-focus', 'today', content));
  bind('datepicker', 'color', 'calendar-today-disabled', 'border-top-color', t('calendar-date-today-disabled-state-outline-color'), cal('ccs-cal-today-disabled', 'today', content));
  bind('datepicker', 'color', 'calendar-selected-disabled', 'background-color', t('calendar-date-selected-disabled-state-background-color'), cal('ccs-cal-selected-disabled', 20, content));
  bind('datepicker', 'color', 'calendar-preview', 'color', t('calendar-date-preview-state-outline-color'), {css: '#ccs-cal-preview .mat-calendar-body-in-preview'});
  bind('datepicker', 'color', 'calendar-hovered-date', 'background-color', t('calendar-date-hover-state-background-color'), cal('ccs-cal-hover', 9, content), {hover: {css: '#ccs-cal-hover', day: 9, sub: null}});
  bind('datepicker', 'typography', 'popup-calendar', 'font-family', t('calendar-text-font'), pop('ccs-dp-primary', '.mat-calendar'));
  bind('datepicker', 'typography', 'popup-calendar', 'font-size', t('calendar-text-size'), pop('ccs-dp-primary', '.mat-calendar'));
  bind('datepicker', 'typography', 'popup-body-label', 'font-size', t('calendar-body-label-text-size'), pop('ccs-dp-primary', '.mat-calendar-body-label'));
  bind('datepicker', 'typography', 'popup-body-label', 'font-weight', t('calendar-body-label-text-weight'), pop('ccs-dp-primary', '.mat-calendar-body-label'));
  bind('datepicker', 'typography', 'popup-period-button', 'font-size', t('calendar-period-button-text-size'), pop('ccs-dp-primary', '.mat-calendar-period-button'));
  bind('datepicker', 'typography', 'popup-period-button', 'font-weight', t('calendar-period-button-text-weight'), pop('ccs-dp-primary', '.mat-calendar-period-button'));
  bind('datepicker', 'typography', 'popup-header-cell', 'font-size', t('calendar-header-text-size'), pop('ccs-dp-primary', '.mat-calendar-table-header th'));
  bind('datepicker', 'typography', 'popup-header-cell', 'font-weight', t('calendar-header-text-weight'), pop('ccs-dp-primary', '.mat-calendar-table-header th'));
  // The peer's M2 datepicker density emits icon-button tokens scoped to .mat-calendar-controls.
  bind('datepicker', 'density', 'popup-next-button', 'width', '--mat-icon-button-state-layer-size', pop('ccs-dp-primary', '.mat-calendar-next-button'));
  bind('datepicker', 'density', 'popup-next-button-touch-target', 'display', '--mat-icon-button-touch-target-display', pop('ccs-dp-primary', '.mat-calendar-next-button .mat-mdc-button-touch-target'));
}

// ---------------------------------------------------------------- divider
bind('divider', 'color', 'divider', 'border-top-color', '--mat-divider-color', {css: '#ccs-divider'});
bind('divider', 'base', 'divider', 'border-top-width', '--mat-divider-width', {css: '#ccs-divider'});

// ---------------------------------------------------------------- expansion
{
  const t = m('expansion');
  const p = (id, sub = '') => ({css: `#${id}${sub ? ` ${sub}` : ''}`});
  bind('expansion', 'color', 'panel', 'background-color', t('container-background-color'), p('ccs-exp-expanded'));
  bind('expansion', 'color', 'panel', 'color', t('container-text-color'), p('ccs-exp-expanded'));
  bind('expansion', 'color', 'panel', 'box-shadow', t('container-elevation-shadow'), p('ccs-exp-expanded'));
  bind('expansion', 'base', 'panel', 'border-top-left-radius', t('container-shape'), p('ccs-exp-expanded'));
  bind('expansion', 'color', 'action-row', 'border-top-color', t('actions-divider-color'), p('ccs-exp-expanded', '.mat-action-row'));
  bind('expansion', 'color', 'header-title', 'color', t('header-text-color'), p('ccs-exp-expanded', '.mat-expansion-panel-header-title'));
  bind('expansion', 'color', 'header-description', 'color', t('header-description-color'), p('ccs-exp-expanded', '.mat-expansion-panel-header-description'));
  bind('expansion', 'color', 'header-indicator', 'color', t('header-indicator-color'), {...p('ccs-exp-expanded', '.mat-expansion-indicator'), pseudo: '::after'});
  bind('expansion', 'base', 'header-indicator', 'display', t('legacy-header-indicator-display'), {...p('ccs-exp-expanded', '.mat-expansion-indicator'), pseudo: '::after'});
  bind('expansion', 'base', 'header-indicator-svg', 'display', t('header-indicator-display'), p('ccs-exp-expanded', '.mat-expansion-indicator svg'));
  bind('expansion', 'color', 'header-disabled', 'color', t('header-disabled-state-text-color'), p('ccs-exp-disabled', '.mat-expansion-panel-header'));
  bind('expansion', 'color', 'header-focused', 'background-color', t('header-focus-state-layer-color'), p('ccs-exp-focus', '.mat-expansion-panel-header'));
  bind('expansion', 'color', 'header-hovered', 'background-color', t('header-hover-state-layer-color'), p('ccs-exp-hover', '.mat-expansion-panel-header'), {hover: '#ccs-exp-hover .mat-expansion-panel-header'});
  for (const [prop, key] of [['font-family', 'text-font'], ['font-size', 'text-size'], ['font-weight', 'text-weight'], ['line-height', 'text-line-height'], ['letter-spacing', 'text-tracking']]) {
    bind('expansion', 'typography', 'header', prop, t(`header-${key}`), p('ccs-exp-expanded', '.mat-expansion-panel-header'));
    bind('expansion', 'typography', 'content', prop, t(`container-${key}`), p('ccs-exp-expanded', '.mat-expansion-panel-content'));
  }
  bind('expansion', 'density', 'header-collapsed', 'height', t('header-collapsed-state-height'), p('ccs-exp-collapsed', '.mat-expansion-panel-header'));
  bind('expansion', 'density', 'header-expanded', 'height', t('header-expanded-state-height'), p('ccs-exp-expanded', '.mat-expansion-panel-header'));
}

// ---------------------------------------------------------------- grid-list
{
  const t = m('grid-list');
  bind('grid-list', 'typography', 'tile-header', 'font-size', t('tile-header-primary-text-size'), {css: '#ccs-grid .mat-grid-tile-header'});
  bind('grid-list', 'typography', 'tile-header-secondary-line', 'font-size', t('tile-header-secondary-text-size'), {css: '#ccs-grid .mat-grid-tile-header .mat-line:nth-child(2)'});
  bind('grid-list', 'typography', 'tile-footer', 'font-size', t('tile-footer-primary-text-size'), {css: '#ccs-grid .mat-grid-tile-footer'});
  bind('grid-list', 'typography', 'tile-footer-secondary-line', 'font-size', t('tile-footer-secondary-text-size'), {css: '#ccs-grid .mat-grid-tile-footer .mat-line:nth-child(2)'});
}

// ---------------------------------------------------------------- icon
for (const [element, id] of [['icon', 'ccs-icon'], ['icon-primary', 'ccs-icon-primary'], ['icon-accent', 'ccs-icon-accent'], ['icon-warn', 'ccs-icon-warn']]) {
  bind('icon', 'color', element, 'color', '--mat-icon-color', {css: `#${id}`});
}

// ---------------------------------------------------------------- sidenav
{
  const t = m('sidenav');
  bind('sidenav', 'color', 'drawer', 'color', t('container-text-color'), {css: '#ccs-sidenav'});
  bind('sidenav', 'color', 'drawer', 'background-color', t('container-background-color'), {css: '#ccs-sidenav'});
  bind('sidenav', 'color', 'drawer-side', 'border-right-color', t('container-divider-color'), {css: '#ccs-sidenav'});
  bind('sidenav', 'color', 'drawer-over', 'box-shadow', t('container-elevation-shadow'), {css: '#ccs-sidenav-over'});
  bind('sidenav', 'color', 'container', 'color', t('content-text-color'), {css: '#ccs-sidenav-container'});
  bind('sidenav', 'color', 'container', 'background-color', t('content-background-color'), {css: '#ccs-sidenav-container'});
  bind('sidenav', 'color', 'backdrop', 'background-color', t('scrim-color'), {css: '#ccs-sidenav-over-container .mat-drawer-backdrop'});
  bind('sidenav', 'base', 'drawer', 'border-top-right-radius', t('container-shape'), {css: '#ccs-sidenav'});
  bind('sidenav', 'base', 'drawer', 'width', t('container-width'), {css: '#ccs-sidenav'});
}

// ---------------------------------------------------------------- stepper
{
  const t = m('stepper');
  // #ccs-stepper headers: 0 edit, 1 done, 2 error, 3 selected, 4 optional and not yet navigable.
  const h = (index, sub) => ({css: '#ccs-stepper .mat-step-header', nth: index, sub});
  for (const [element, index, fg, bg] of [
    ['icon', 4, 'header-icon-foreground-color', 'header-icon-background-color'],
    ['icon-selected', 3, 'header-selected-state-icon-foreground-color', 'header-selected-state-icon-background-color'],
    ['icon-done', 1, 'header-done-state-icon-foreground-color', 'header-done-state-icon-background-color'],
    ['icon-edit', 0, 'header-edit-state-icon-foreground-color', 'header-edit-state-icon-background-color'],
    ['icon-error', 2, 'header-error-state-icon-foreground-color', 'header-error-state-icon-background-color'],
  ]) {
    bind('stepper', 'color', element, 'color', t(fg), h(index, '.mat-step-icon'));
    bind('stepper', 'color', element, 'background-color', t(bg), h(index, '.mat-step-icon'));
  }
  for (const [variant, id] of [['accent', 'ccs-stepper-accent'], ['warn', 'ccs-stepper-warn']]) {
    // headers: 0 edit, 1 selected
    bind('stepper', 'color', `${variant}-icon-selected`, 'background-color', t('header-selected-state-icon-background-color'), {css: `#${id} .mat-step-header`, nth: 1, sub: '.mat-step-icon'});
    bind('stepper', 'color', `${variant}-icon-selected`, 'color', t('header-selected-state-icon-foreground-color'), {css: `#${id} .mat-step-header`, nth: 1, sub: '.mat-step-icon'});
    bind('stepper', 'color', `${variant}-icon-edit`, 'background-color', t('header-edit-state-icon-background-color'), {css: `#${id} .mat-step-header`, nth: 0, sub: '.mat-step-icon'});
  }
  bind('stepper', 'color', 'container', 'background-color', t('container-color'), {css: '#ccs-stepper'});
  bind('stepper', 'color', 'line', 'border-top-color', t('line-color'), {css: '#ccs-stepper .mat-stepper-horizontal-line'});
  bind('stepper', 'color', 'label', 'color', t('header-label-text-color'), h(4, '.mat-step-label'));
  bind('stepper', 'color', 'label-active', 'color', t('header-selected-state-label-text-color'), h(0, '.mat-step-label'));
  bind('stepper', 'color', 'label-error', 'color', t('header-error-state-label-text-color'), h(2, '.mat-step-label'));
  bind('stepper', 'color', 'label-optional', 'color', t('header-optional-label-text-color'), h(4, '.mat-step-optional'));
  bind('stepper', 'color', 'header-hovered', 'background-color', t('header-hover-state-layer-color'), {css: '#ccs-stepper-states .mat-step-header', nth: 0}, {hover: {css: '#ccs-stepper-states .mat-step-header', nth: 0}});
  bind('stepper', 'base', 'header-hovered', 'border-top-left-radius', t('header-hover-state-layer-shape'), {css: '#ccs-stepper-states .mat-step-header', nth: 0}, {hover: {css: '#ccs-stepper-states .mat-step-header', nth: 0}});
  bind('stepper', 'color', 'header-focused', 'background-color', t('header-focus-state-layer-color'), {css: '#ccs-stepper-states .mat-step-header', nth: 1});
  bind('stepper', 'base', 'header-focused', 'border-top-left-radius', t('header-focus-state-layer-shape'), {css: '#ccs-stepper-states .mat-step-header', nth: 1});
  bind('stepper', 'typography', 'container', 'font-family', t('container-text-font'), {css: '#ccs-stepper'});
  bind('stepper', 'typography', 'label', 'font-family', t('header-label-text-font'), h(4, '.mat-step-label'));
  bind('stepper', 'typography', 'label', 'font-size', t('header-label-text-size'), h(4, '.mat-step-label'));
  bind('stepper', 'typography', 'label', 'font-weight', t('header-label-text-weight'), h(4, '.mat-step-label'));
  bind('stepper', 'typography', 'label-error', 'font-size', t('header-error-state-label-text-size'), h(2, '.mat-step-label'));
  bind('stepper', 'typography', 'label-selected', 'font-size', t('header-selected-state-label-text-size'), h(3, '.mat-step-label'));
  bind('stepper', 'typography', 'label-selected', 'font-weight', t('header-selected-state-label-text-weight'), h(3, '.mat-step-label'));
  bind('stepper', 'density', 'header', 'height', t('header-height'), h(0, null));
}

// ---------------------------------------------------------------- sort
bind('sort', 'color', 'arrow', 'color', '--mat-sort-arrow-color', {css: '#ccs-sort .mat-sort-header-arrow'});

// ---------------------------------------------------------------- toolbar
{
  const t = m('toolbar');
  for (const [element, id] of [['toolbar', 'ccs-toolbar'], ['toolbar-primary', 'ccs-toolbar-primary'], ['toolbar-accent', 'ccs-toolbar-accent'], ['toolbar-warn', 'ccs-toolbar-warn']]) {
    bind('toolbar', 'color', element, 'background-color', t('container-background-color'), {css: `#${id}`});
    bind('toolbar', 'color', element, 'color', t('container-text-color'), {css: `#${id}`});
  }
  for (const [prop, key] of [['font-family', 'title-text-font'], ['font-size', 'title-text-size'], ['line-height', 'title-text-line-height'], ['font-weight', 'title-text-weight'], ['letter-spacing', 'title-text-tracking']]) {
    bind('toolbar', 'typography', 'toolbar', prop, t(key), {css: '#ccs-toolbar'});
  }
  bind('toolbar', 'density', 'toolbar-row', 'height', t('standard-height'), {css: '#ccs-toolbar'});
  bind('toolbar', 'density', 'toolbar-row-narrow-viewport', 'height', t('mobile-height'), {css: '#ccs-toolbar'}, {scenarios: ['narrow-light', 'narrow-dense']});
}

// ---------------------------------------------------------------- tree
{
  const t = m('tree');
  bind('tree', 'color', 'tree', 'background-color', t('container-background-color'), {css: '#ccs-tree'});
  bind('tree', 'color', 'node', 'color', t('node-text-color'), {css: '#ccs-tree .mat-tree-node'});
  bind('tree', 'typography', 'node', 'font-family', t('node-text-font'), {css: '#ccs-tree .mat-tree-node'});
  bind('tree', 'typography', 'node', 'font-size', t('node-text-size'), {css: '#ccs-tree .mat-tree-node'});
  bind('tree', 'typography', 'node', 'font-weight', t('node-text-weight'), {css: '#ccs-tree .mat-tree-node'});
  bind('tree', 'density', 'node', 'min-height', t('node-min-height'), {css: '#ccs-tree .mat-tree-node'});
}

export function caseId(binding) {
  return `${binding.companion}/${binding.dimension}/${binding.element}/${binding.property}`;
}

export function notApplicableId(companion, dimension) {
  return `${companion}/${dimension}/not-applicable`;
}

export function oracleCaseId(companion) {
  return `${companion}/peer-oracle`;
}

/** The reviewed bindings, frozen, each with its case id and scenarios. */
export const BINDINGS = Object.freeze(BINDINGS_RAW.map((binding) => Object.freeze({
  ...binding,
  id: caseId(binding),
  scenarios: binding.scenarios ? [...binding.scenarios, ...RICH_THEME_IDS.map(id=>'narrow-'+id)] : DEFAULT_SCENARIOS,
  negative_scenario: (binding.scenarios || DEFAULT_SCENARIOS).includes(NEGATIVE_SCENARIO)
    ? NEGATIVE_SCENARIO : (binding.scenarios || DEFAULT_SCENARIOS)[0],
})));

// ---------------------------------------------------------------- sentinels
const SENTINEL_KIND = {
  color: 'color', 'background-color': 'color', 'border-top-color': 'color', 'border-right-color': 'color', fill: 'color',
  'box-shadow': 'shadow',
  'border-top-left-radius': 'length', 'border-top-right-radius': 'length', width: 'length', 'min-width': 'length',
  height: 'length', 'min-height': 'length', 'line-height': 'length', 'margin-top': 'length', 'padding-left': 'length',
  'font-size': 'length', 'border-top-width': 'length',
  'letter-spacing': 'tracking', 'font-weight': 'weight', 'font-family': 'family', opacity: 'opacity', display: 'display',
};

export function sentinelKind(property, override = null) {
  const kind = override || SENTINEL_KIND[property];
  if (!kind) throw new Error(`no sentinel kind for ${property}`);
  return kind;
}

/**
 * A distinct, valid, wrong-but-nonempty value per token. Injected on the
 * candidate scope only; the oracle keeps its peer values. `marker` is what the
 * consuming property must then show, proving the element consumes the token.
 */
export function sentinelTable(bindings = BINDINGS) {
  const tokens = new Map();
  for (const binding of bindings) {
    const kind = sentinelKind(binding.property, binding.sentinel_kind);
    const known = tokens.get(binding.token);
    if (known && known.kind !== kind) throw new Error(`${binding.token}: conflicting sentinel kinds ${known.kind}/${kind}`);
    if (!known) tokens.set(binding.token, {kind});
  }
  const table = {};
  const counters = {};
  for (const [token, {kind}] of [...tokens].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    counters[kind] = (counters[kind] || 0) + 1;
    const k = counters[kind];
    let value; let marker;
    if (kind === 'color') { value = `rgb(1, 2, ${k})`; marker = value; }
    else if (kind === 'shadow') { value = `rgb(1, 3, ${k}) 3px 4px 5px 6px`; marker = `rgb(1, 3, ${k})`; }
    else if (kind === 'length') { value = `${300 + k}px`; marker = value; }
    else if (kind === 'tracking') { value = `${(2 + k / 100).toFixed(2)}px`; marker = value; }
    else if (kind === 'weight') { value = String(300 + k); marker = value; }
    else if (kind === 'family') { value = `ccs-sentinel-${k}`; marker = value; }
    else if (kind === 'opacity') { value = `0.${10 + k}`; marker = value; }
    else { value = 'table'; marker = 'table'; }
    table[token] = {kind, value, marker};
  }
  return table;
}

export function sentinelSeen(observed, sentinel) {
  if (typeof observed !== 'string' || !sentinel) return false;
  if (sentinel.kind === 'color' || sentinel.kind === 'shadow' || sentinel.kind === 'family') return observed.includes(sentinel.marker);
  if (sentinel.kind === 'display' || sentinel.kind === 'weight' || sentinel.kind === 'opacity') return observed.trim() === sentinel.marker;
  const escaped = sentinel.marker.replace(/[.]/g, '\\.');
  return new RegExp(`(^|[^0-9.])${escaped}($|[^0-9])`).test(observed);
}

// ---------------------------------------------------------------- peer derivation
const SILENCE = ['if-function', 'global-builtin', 'color-functions', 'import'];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function themeSass(ns, {m2Prefix}) {
  const pal = ([name, ...hues]) => `${ns}.${m2Prefix}define-palette(${[`${ns}.$${m2Prefix}${name}-palette`, ...hues].join(', ')})`;
  const lines = [
    `$ccs-color: (primary: ${pal(PALETTES.primary)}, accent: ${pal(PALETTES.accent)}, warn: ${pal(PALETTES.warn)});`,
    `$ccs-type-legacy: ${ns}.${m2Prefix}define-legacy-typography-config();`,
    `$ccs-type-alternate: ${ns}.${m2Prefix}define-typography-config($font-family: '${ALTERNATE_FONT_FAMILY}');`,
  ];
  for (const [name, theme] of Object.entries(THEMES)) {
    let color='$ccs-color',typography=`$ccs-type-${theme.typography}`;
    if (theme.customTypography) {
      color=`$ccs-color-${name}`;typography=`$ccs-type-${name}`;
      const level=`$ccs-level-${name}`;
      lines.push(`${color}: (primary: ${pal(theme.primary)}, accent: ${pal(theme.accent)}, warn: ${pal(theme.warn)});`);
      lines.push(`${level}: ${ns}.${m2Prefix}define-typography-level(19px, 27px, 600, 'Closeout Font', 0.03em);`);
      const constructor=theme.typography==='legacy'?'define-legacy-typography-config':'define-typography-config';
      lines.push(`${typography}: ${ns}.${m2Prefix}${constructor}($font-family: '${theme.fontFamily}', $body-1: ${level}, $button: ${level});`);
    }
    lines.push(`$ccs-theme-${name}: ${ns}.${m2Prefix}define-${theme.type}-theme((color: ${color}, typography: ${typography}, density: ${theme.density}));`);
  }
  return lines.join('\n');
}

/** Peer oracle stylesheet: the peer's own M2 constructors and companion theme mixins. */
export function oracleScss() {
  const rules = Object.keys(THEMES).map((name) =>
    `.ccs-oracle-${name} { ${COMPANIONS.map((c) => `@include mat.${c}-theme($ccs-theme-${name});`).join(' ')} }`);
  return `@use '@angular/material' as mat;\n${themeSass('mat', {m2Prefix: 'm2-'})}\n${rules.join('\n')}\n`;
}

/** Candidate stylesheet: named public themes and the separate bridge aggregate. */
export function candidateScss(moduleUrl = '@ngx-compat/material-legacy') {
  const rules = Object.keys(THEMES).map((name) =>
    `.ccs-candidate-${name} { ${COMPANIONS.map((c) => `@include legacy.${c}-theme($ccs-theme-${name});`).join(' ')} }\n.ccs-bridge-${name} { @include legacy.all-current-companion-bridges($ccs-theme-${name}); }`);
  return `@use '${moduleUrl}' as legacy with ($theme-ignore-duplication-warnings: true);\n${themeSass('legacy', {m2Prefix: ''})}\n${rules.join('\n')}\n`;
}

/**
 * Wrong-but-nonempty value for one token on the candidate scope (negative read
 * only). Tokens are injected one at a time so that another token's sentinel
 * (padding, min-width, ...) cannot mask or reshape the consuming property.
 */
export function sentinelCss(table, token, scenario = NEGATIVE_SCENARIO, mode = 'candidate') {
  if (!['candidate', 'bridge'].includes(mode)) throw new Error(`invalid sentinel mode ${mode}`);
  const s = table[token];
  if (!s) throw new Error(`no sentinel for ${token}`);
  const theme = SCENARIOS[scenario].outer;
  return `.ccs-${mode}-${theme}, .ccs-${mode}-${theme} * { ${token}: ${s.value} !important; }\n`;
}

export function parseDeclarations(css) {
  const out = new Set();
  for (const match of css.matchAll(/(--mat-[a-z0-9-]+)\s*:/g)) out.add(match[1]);
  return [...out].sort();
}

function peerRoots(nodeModules) {
  const materialRoot = realpathSync(path.join(nodeModules, '@angular/material'));
  const pkgBytes = readFileSync(path.join(materialRoot, 'package.json'));
  const cdkLink = path.join(nodeModules, '@angular/cdk');
  const cdkRoot = existsSync(cdkLink) ? realpathSync(cdkLink)
    : realpathSync(path.join(materialRoot, '..', 'cdk'));
  return {materialRoot, cdkRoot, pkgBytes};
}

/** Identity of the peer installed under `nodeModules`. */
export function peerIdentity(nodeModules) {
  const {materialRoot, cdkRoot, pkgBytes} = peerRoots(nodeModules);
  return {
    package: PEER_PACKAGE,
    version: JSON.parse(pkgBytes).version,
    package_json_sha256: sha256(pkgBytes),
    realpath: materialRoot,
    cdk_realpath: cdkRoot,
  };
}

/** Compile Sass only from the peer packages; throw on any foreign load. */
export function compilePeerOnly(sass, nodeModules, body, entryName, identity = peerIdentity(nodeModules)) {
  const entry = path.join(path.dirname(nodeModules), entryName);
  const result = sass.compileString(body, {
    loadPaths: [nodeModules],
    style: 'expanded',
    url: pathToFileURL(entry),
    silenceDeprecations: SILENCE,
  });
  const loaded = result.loadedUrls.map((url) => url.pathname).filter((p) => p !== entry)
    .map((p) => (existsSync(p) ? realpathSync(p) : p));
  const foreign = loaded.filter((p) => !p.startsWith(identity.realpath + path.sep) && !p.startsWith(identity.cdk_realpath + path.sep));
  if (foreign.length) throw new Error(`peer oracle loaded non-peer Sass: ${foreign.slice(0, 5).join(', ')}`);
  return {css: result.css, loaded_files: loaded.length, sha256: sha256(result.css)};
}

/**
 * Per companion and dimension, the tokens the installed peer's own
 * `mat.<companion>-<dimension>` mixin emits for each theme, plus the peer
 * `<companion>/_m2-<companion>.scss` source identity.
 */
export function peerDimensionTokens(sass, nodeModules, identity = peerIdentity(nodeModules)) {
  const out = {};
  for (const companion of COMPANIONS) {
    const rel = `${companion}/_m2-${companion}.scss`;
    const file = path.join(identity.realpath, rel);
    out[companion] = {
      peer_source_file: existsSync(file) ? rel : null,
      peer_source_sha256: existsSync(file) ? sha256(readFileSync(file)) : null,
      dimensions: Object.fromEntries(DIMENSIONS.map((d) => [d, {tokens: new Set(), by_theme: {}, declared: {}}])),
    };
  }
  for (const name of Object.keys(THEMES)) {
    const blocks = [];
    for (const companion of COMPANIONS) {
      for (const dimension of DIMENSIONS) {
        blocks.push(`.ccs-p-${companion}--${dimension} { @include mat.${companion}-${dimension}($ccs-theme-${name}); }`);
      }
    }
    const body = `@use '@angular/material' as mat;\n${themeSass('mat', {m2Prefix: 'm2-'})}\n${blocks.join('\n')}\n`;
    const {css} = compilePeerOnly(sass, nodeModules, body, `ccs-dimensions-${name}.scss`, identity);
    const per = {};
    const values = {};
    for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const owner = block[1].match(/\.ccs-p-([a-z-]+?)--([a-z]+)/);
      if (!owner) continue;
      const key = `${owner[1]}\u0000${owner[2]}`;
      for (const decl of block[2].matchAll(/(--mat-[a-z0-9-]+)\s*:\s*([^;]*);?/g)) {
        (per[key] ||= new Set()).add(decl[1]);
        // Declared values are recorded for the root scope only, not variant descendants.
        if (block[1].trim() === owner[0]) ((values[key] ||= {})[decl[1]] ||= new Set()).add(decl[2].trim());
      }
    }
    for (const companion of COMPANIONS) {
      for (const dimension of DIMENSIONS) {
        const found = [...(per[`${companion}\u0000${dimension}`] || [])].sort();
        const slot = out[companion].dimensions[dimension];
        slot.by_theme[name] = found;
        for (const token of found) {
          slot.tokens.add(token);
          for (const value of values[`${companion}\u0000${dimension}`]?.[token] || []) (slot.declared[token] ||= new Set()).add(value);
        }
      }
    }
  }
  for (const companion of COMPANIONS) {
    for (const dimension of DIMENSIONS) {
      const slot = out[companion].dimensions[dimension];
      slot.tokens = [...slot.tokens].sort();
      slot.declared = Object.fromEntries(Object.entries(slot.declared).map(([token, set]) => [token, [...set].sort()]));
    }
  }
  return out;
}

/** CSS-wide keywords: a custom property declared with one has no computed token value of its own. */
export const CSS_WIDE_KEYWORDS = ['inherit', 'initial', 'unset', 'revert', 'revert-layer'];

/**
 * Tokens the peer's own dimension mixins declare with a CSS-wide keyword in
 * every theme (for example badge `container-size: unset`, icon `color: inherit`).
 * getComputedStyle reports no value for such a token; the consuming property
 * still has to match the oracle and still has to consume an injected value.
 */
export function peerKeywordTokens(dimensionTokens) {
  const out = {};
  for (const info of Object.values(dimensionTokens || {})) {
    for (const slot of Object.values(info.dimensions || {})) {
      for (const [token, values] of Object.entries(slot.declared || {})) {
        if (values.length === 1 && CSS_WIDE_KEYWORDS.includes(values[0])) out[token] = values[0];
      }
    }
  }
  return out;
}

/**
 * Deterministic roster from the peer dimension compile and the reviewed bindings.
 * Returns case ids per matrix group, the rostered bindings, and every
 * not-applicable companion dimension with the peer evidence behind it.
 */
export function deriveRoster(dimensionTokens, bindings = BINDINGS) {
  const rostered = [];
  const notApplicable = [];
  const dimensionIds = [];
  const unbound = [];
  for (const companion of COMPANIONS) {
    const info = dimensionTokens[companion];
    if (!info) throw new Error(`peer dimension tokens missing ${companion}`);
    for (const dimension of DIMENSIONS) {
      const emitted = info.dimensions[dimension]?.tokens || [];
      const mine = bindings.filter((b) => b.companion === companion && b.dimension === dimension);
      if (!emitted.length) {
        if (mine.length) throw new Error(`${companion}/${dimension}: bindings exist but the peer emits no token`);
        const id = notApplicableId(companion, dimension);
        notApplicable.push({id, companion, dimension, peer_source_file: info.peer_source_file,
          peer_source_sha256: info.peer_source_sha256, peer_mixin: `mat.${companion}-${dimension}`});
        dimensionIds.push(id);
        continue;
      }
      for (const binding of mine) {
        if (!emitted.includes(binding.token)) throw new Error(`${binding.id}: peer ${dimension} mixin does not emit ${binding.token}`);
        rostered.push(binding);
        dimensionIds.push(binding.id);
      }
      const bound = new Set(mine.map((b) => b.token));
      for (const token of emitted) if (!bound.has(token)) unbound.push(`${companion}/${dimension}: ${token}`);
    }
  }
  if (new Set(dimensionIds).size !== dimensionIds.length) throw new Error('duplicate computed-style case ids');
  return {
    groups: {
      [GROUP_DIMENSIONS]: dimensionIds,
      [GROUP_ORACLE]: COMPANIONS.map(oracleCaseId),
    },
    rostered,
    notApplicable,
    unbound,
  };
}

// ---------------------------------------------------------------- pure assessment
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * One dimension case. `obs` = {oracle: {scenario: o}, candidate: {scenario: o}, bridge: {scenario: o},
 * negative: o, bridge_negative: o} where o = {found, value, token_value}. Passes only when, in every
 * scenario, all three elements exist, the peer oracle defines the token on the
 * consuming element, and the candidate's computed property equals the
 * oracle's; and, with a wrong-but-nonempty token injected on the candidate
 * scope, the consuming property shows that wrong value and no longer equals
 * the oracle.
 */
export function assessCase(binding, obs, sentinel, {peerKeyword = null} = {}) {
  const reasons = [];
  const keyword = CSS_WIDE_KEYWORDS.includes(peerKeyword) ? peerKeyword : null;
  const scenarios = [];
  for (const scenario of binding.scenarios) {
    const o = obs?.oracle?.[scenario];
    const c = obs?.candidate?.[scenario];
    const b = obs?.bridge?.[scenario];
    const row = {
      scenario,
      oracle: o?.value ?? null,
      candidate: c?.value ?? null,
      bridge: b?.value ?? null,
      bridge_token: b?.token_value ?? null,
      oracle_token: o?.token_value ?? null,
      candidate_token: c?.token_value ?? null,
      match: false,
    };
    if (!o?.found) reasons.push(`${scenario}: oracle consuming element not rendered`);
    else if (!c?.found) reasons.push(`${scenario}: candidate consuming element not rendered`);
    else if (!b?.found) reasons.push(`${scenario}: bridge consuming element not rendered`);
    else if (!nonEmpty(o.token_value) && !keyword) reasons.push(`${scenario}: peer oracle does not define ${binding.token} on the consuming element`);
    else if (!nonEmpty(o.value)) reasons.push(`${scenario}: oracle computed ${binding.property} is empty`);
    else if (o.value !== c.value) reasons.push(`${scenario}: candidate ${binding.property} ${JSON.stringify(c.value)} != peer ${JSON.stringify(o.value)}`);
    else if (o.value !== b.value) reasons.push(`${scenario}: bridge ${binding.property} ${JSON.stringify(b.value)} != peer ${JSON.stringify(o.value)}`);
    else row.match = true;
    scenarios.push(row);
  }
  const n = obs?.negative;
  const negativeScenario = binding.negative_scenario || NEGATIVE_SCENARIO;
  const oracleNegative = obs?.oracle?.[negativeScenario]?.value ?? null;
  const negative = {
    scenario: negativeScenario,
    injected: sentinel?.value ?? null,
    observed: n?.value ?? null,
    oracle: oracleNegative,
    sentinel_consumed: Boolean(n?.found && sentinelSeen(n.value, sentinel)),
    mismatch_detected: Boolean(n?.found && nonEmpty(n.value) && n.value !== oracleNegative),
  };
  if (!sentinel) reasons.push('no wrong-but-nonempty sentinel for the token');
  else if (!n?.found) reasons.push('negative: candidate consuming element not rendered');
  else if (!negative.sentinel_consumed) reasons.push(`negative: ${binding.property} ${JSON.stringify(n.value)} does not consume injected ${binding.token}=${sentinel.value}`);
  else if (!negative.mismatch_detected) reasons.push('negative: wrong token did not change the comparison');
  const bn = obs?.bridge_negative;
  const bridgeNegative = {
    scenario: negativeScenario,
    injected: sentinel?.value ?? null,
    observed: bn?.value ?? null,
    oracle: oracleNegative,
    sentinel_consumed: Boolean(bn?.found && sentinelSeen(bn.value, sentinel)),
    mismatch_detected: Boolean(bn?.found && nonEmpty(bn.value) && bn.value !== oracleNegative),
  };
  if (!bridgeNegative.sentinel_consumed || !bridgeNegative.mismatch_detected)
    reasons.push('bridge negative: wrong token not consumed or comparison unchanged');
  return {
    case_id: binding.id,
    result: reasons.length ? 'fail' : 'pass',
    reasons,
    peer_declared_keyword: keyword,
    scenarios,
    negative,
    bridge_negative: bridgeNegative,
  };
}

/**
 * Oracle integrity for one companion. The oracle CSS must come from the peer
 * only (no foreign Sass load) at the run's peer version; every rostered case
 * of the companion must have the peer token defined on its consuming element
 * (checked per case); and in each applicable color/typography/density
 * dimension at least one case's oracle value must move between the scenario
 * pair (or, where the peer's values do not depend on that input, differ from
 * the same element with no theme class), so an unthemed or no-op oracle
 * cannot pass.
 */
export function assessOracle(companion, caseResults, {identity, isolation, applicable}) {
  const reasons = [];
  if (!identity || identity.package !== PEER_PACKAGE || !nonEmpty(identity.version)) reasons.push('peer identity missing');
  if (!isolation?.peer_only) reasons.push('oracle Sass was not compiled from the peer only');
  const sensitivity = {};
  for (const dimension of applicable) {
    const pair = SENSITIVITY[dimension];
    const mine = caseResults.filter((r) => r.dimension === dimension);
    if (!pair) {
      const defined = mine.length > 0 && mine.every((r) => r.scenarios.every((s) => nonEmpty(s.oracle_token) || CSS_WIDE_KEYWORDS.includes(r.peer_declared_keyword)));
      sensitivity[dimension] = {kind: 'peer-token-defined', ok: defined};
      if (!defined) reasons.push(`${dimension}: peer oracle tokens not defined on every consuming element`);
      continue;
    }
    const moves = (r) => {
      const a = r.scenarios.find((s) => s.scenario === pair[0]);
      const b = r.scenarios.find((s) => s.scenario === pair[1]);
      return Boolean(a && b && nonEmpty(a.oracle) && nonEmpty(b.oracle) && a.oracle !== b.oracle);
    };
    const leavesUnthemed = (r) => {
      const a = r.scenarios.find((s) => s.scenario === pair[0]);
      return Boolean(a && nonEmpty(a.oracle) && typeof r.unthemed === 'string' && a.oracle !== r.unthemed);
    };
    const moved = mine.find(moves);
    const themed = moved ? null : mine.find(leavesUnthemed);
    const witness = moved || themed;
    sensitivity[dimension] = {
      kind: moved ? `${pair[0]}-vs-${pair[1]}` : `${pair[0]}-vs-unthemed`,
      ok: Boolean(witness),
      witness: witness?.case_id ?? null,
    };
    if (!witness) reasons.push(`${dimension}: peer oracle neither changed between ${pair[0]} and ${pair[1]} nor differed from the unthemed page`);
  }
  return {case_id: oracleCaseId(companion), result: reasons.length ? 'fail' : 'pass', reasons, sensitivity};
}

/** Not-applicable dimension: the live peer dimension mixin emitted nothing in any theme. */
export function assessNotApplicable(entry, dimensionTokens) {
  const info = dimensionTokens?.[entry.companion]?.dimensions?.[entry.dimension];
  const emitted = info ? info.tokens : null;
  const ok = Array.isArray(emitted) && emitted.length === 0 && nonEmpty(entry.peer_source_sha256);
  return {
    case_id: entry.id,
    result: ok ? 'pass' : 'fail',
    reasons: ok ? [] : ['peer dimension mixin emitted tokens or peer source is missing'],
    peer_emitted_tokens: emitted,
  };
}

export function caseFileName(id) {
  return `${id.replace(/\//g, '__')}.json`;
}
