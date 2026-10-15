/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 * Copyright (c) 2026 Ryan Lester.
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export const GENERATED_IDENTITY_CASE_ID = 'packed-consumer/harness/generated-identity-coexistence';
export const GENERATED_IDENTITY_ROLE_COUNTS = {
  option: 1, 'optgroup-label': 1, autocomplete: 1, select: 2, 'select-value': 2,
  'select-panel': 2, 'active-option': 3, 'menu-panel': 1, 'snack-live': 1,
  'tab-link': 1, 'tab-panel': 1,
};
const generations = ['legacy', 'current'];
const prefixes = {option: 'mat-option-', 'optgroup-label': 'mat-optgroup-label-',
  autocomplete: 'mat-autocomplete-', select: 'mat-select-', 'select-value': 'mat-select-value-',
  'active-option': 'mat-option-', 'menu-panel': 'mat-menu-panel-',
  'snack-live': 'mat-snack-bar-container-live-', 'tab-link': 'mat-tab-link-', 'tab-panel': 'mat-tab-nav-panel-'};
const structures = ['option_text', 'group_label', 'autocomplete_panel', 'select_trigger',
  'select_value', 'select_panel_wrap', 'menu_panel', 'menu_content', 'tab_link', 'tab_panel', 'snack_container'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const owns = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);

/** Serialized node evidence is required; synthetic controls qualify only this predicate. */
export function packedGeneratedIdentityCase(observed) {
  let okay = false;
  try {
    const demand = value => {if (!value) throw Error('Missing generated identity observation');};
    demand(observed?.execution === 'packed-angular-testbed-dom' && observed.error === null);
    demand(Array.isArray(observed.orders) && observed.orders.length === 2);
    for (const [position, order] of observed.orders.entries()) {
      const names = position === 0 ? generations : [...generations].reverse();
      demand(order.order === names[0] + '-first' && same(order.creation_order, names));
      demand(order.scopes_separate === true && same(order.duplicate_id_snapshots, []));
      demand(Array.isArray(order.nodes) && order.nodes.length === 32);
      demand(new Set(order.nodes.map(row => row.id)).size === 32);
      const node = (generation, role, index = 0) => {
        const rows = order.nodes.filter(row => row.generation === generation && row.role === role && row.index === index);
        demand(rows.length === 1); return rows[0];
      };
      for (const generation of generations) {
        const state = order.generations?.find(row => row.generation === generation);
        demand(state && order.generations.length === 2 && state.public_instances === true);
        demand(state.option_explicit_id === `packed-${generation}-option-explicit` && state.option_explicit_resolves === true);
        demand(state.group_label === `Standalone ${generation}`);
        demand(state.snack_panel_class === true);
        if (generation === 'legacy') demand(structures.every(key => state.legacy_structure?.[key] === true));
        for (const [role, count] of Object.entries(GENERATED_IDENTITY_ROLE_COUNTS)) {
          demand(order.nodes.filter(row => row.generation === generation && row.role === role).length === count);
          for (let index = 0; index < count; index++) {
            const row = node(generation, role, index);
            demand(typeof row.id === 'string' && row.resolution_count === 1 && row.exact_node === true && row.owner_matches === true);
            if (role === 'select-panel') demand(row.id === node(generation, 'select', index).id + '-panel');
            else {const prefix=role==='snack-live'&&generation==='legacy'?'mat-legacy-snack-bar-container-live-':prefixes[role];const suffix=generation==='legacy'&&role!=='snack-live'?'-legacy':'';demand(new RegExp('^'+prefix+'[0-9]+'+suffix+'$').test(row.id));}
          }
        }
      }
      const checkEdges = (rows, expected) => {
        demand(Array.isArray(rows) && rows.length === expected.length);
        for (const [generation, name, attribute, id] of expected) {
          const found = rows.filter(row => row.generation === generation && row.name === name);
          demand(found.length === 1); const edge = found[0];
          demand(edge.attribute === attribute && edge.value === id && edge.target_id === id && edge.target_count === 1 && edge.exact_target === true);
        }
      };
      const expected = generations.flatMap(generation => [
        [generation, 'group-label', 'aria-labelledby', node(generation, 'optgroup-label').id],
        [generation, 'autocomplete-panel', generation === 'legacy' ? 'aria-owns' : 'aria-controls', node(generation, 'autocomplete').id],
        [generation, 'autocomplete-active', 'aria-activedescendant', node(generation, 'active-option', 0).id],
        ...[0, 1].flatMap(index => [
          [generation, `select-${index}-panel`, 'aria-controls', node(generation, 'select-panel', index).id],
          [generation, `select-${index}-active`, 'aria-activedescendant', node(generation, 'active-option', index + 1).id],
        ]),
        [generation, 'menu-panel', 'aria-controls', node(generation, 'menu-panel').id],
        [generation, 'tab-panel', 'aria-controls', node(generation, 'tab-panel').id],
        [generation, 'tab-label', 'aria-labelledby', node(generation, 'tab-link').id],
      ]);
      checkEdges(order.default_edges, expected);
      checkEdges(order.changed_tab_edges, generations.flatMap(generation => [
        [generation, 'tab-panel', 'aria-controls', node(generation, 'tab-panel').id],
        [generation, 'tab-label', 'aria-labelledby', `packed-${generation}-tab-explicit`],
      ]));
      demand(Array.isArray(order.explicit) && order.explicit.length === 2);
      for (const generation of generations) {
        const explicit = order.explicit.find(row => row.generation === generation);
        demand(explicit && ['autocomplete', 'select', 'tab-panel', 'tab-link'].every(role =>
          owns(explicit.ids, role) && explicit.ids[role] === `packed-${generation}-${role}-override`));
        demand(explicit.select_value_id === node(generation, 'select-value', 0).id);
        demand(explicit.option_id === `packed-${generation}-option-explicit` && explicit.values_resolve === true);
      }
      checkEdges(order.explicit_edges, generations.flatMap(generation => [
        [generation, 'autocomplete-panel', generation === 'legacy' ? 'aria-owns' : 'aria-controls', `packed-${generation}-autocomplete-override`],
        [generation, 'select-0-panel', 'aria-controls', `packed-${generation}-select-override-panel`],
        [generation, 'tab-panel', 'aria-controls', `packed-${generation}-tab-panel-override`],
        [generation, 'tab-label', 'aria-labelledby', `packed-${generation}-tab-link-override`],
      ]));
      const live = names.map(generation => node(generation, 'snack-live').id), preserved = 'packed-identity-preserved';
      demand(Array.isArray(order.snack_lifecycle) && order.snack_lifecycle.length === 3);
      for (const [index, state] of order.snack_lifecycle.entries()) {
        demand(state.stage === ['opened', 'first-dismissed', 'both-dismissed'][index]);
        demand(same([...state.modal_owns].sort(), [preserved, ...live.slice(index)].sort()));
        demand(same(state.live_present, live.map((_, i) => i >= index)));
        demand(state.all_references_resolve === true);
      }
      demand(order.cleanup?.fixtures_destroyed === 2 && order.cleanup.modal_disposed === true);
      demand(order.cleanup.retained_target_count === 0 && order.cleanup.overlay_target_count === 0);
    }
    okay = true;
  } catch { /* Invalid, absent or incomplete observations fail admission. */ }
  return {case_id: GENERATED_IDENTITY_CASE_ID, result: okay ? 'pass' : 'fail', observation: observed ?? null,
    failure: okay ? null : 'Missing or failed packed mixed-generation node IDs, ARIA targets, explicit inputs or cleanup'};
}
