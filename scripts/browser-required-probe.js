/* Browser-side checks for one declared matrix cell. The runner calls
   __begin({family, state}) and polls __poll() until done. A cell is credited
   only when this script reports ok with evidence from the live document. */
(function () {
  const HOST = {
    autocomplete: '#wrap-autocomplete',
    button: '#wrap-button',
    card: '#wrap-card',
    checkbox: '#wrap-checkbox',
    chips: '#wrap-chips',
    core: '#wrap-core',
    dialog: '#wrap-dialog',
    'form-field': '#wrap-field',
    input: '#wrap-input',
    list: '#wrap-list',
    menu: '#wrap-menu',
    paginator: '#wrap-paginator',
    'progress-bar': '#wrap-bar',
    'progress-spinner': '#wrap-spinner',
    radio: '#wrap-radio',
    select: '#wrap-select',
    'slide-toggle': '#wrap-toggle',
    slider: '#wrap-slider',
    'snack-bar': '#wrap-snack',
    table: '#wrap-table',
    tabs: '#wrap-tabs',
    tooltip: '#wrap-tooltip',
  };

  let pointerSerial = 0;
  let pendingPointer = null;
  let cleanup = () => {};

  window.__pointerDone = function (id) {
    if (!pendingPointer || pendingPointer.id !== id || window.__status !== pendingPointer.owner) return false;
    const complete = pendingPointer.complete; pendingPointer = null;
    complete(); return true;
  };

  function pointerClick(node, then) {
    node.scrollIntoView({block: 'center'});
    const box = node.getBoundingClientRect();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    if (pendingPointer || box.width <= 0 || box.height <= 0 || !Number.isFinite(x) || !Number.isFinite(y) ||
        x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) {
      finish(false, 'native pointer geometry unavailable'); return;
    }
    pendingPointer = {id: ++pointerSerial, owner: window.__status, x, y, complete: then};
  }

  function finish(ok, evidence) {
    if (window.__status && window.__status.done) return;
    cleanup(); cleanup = () => {}; pendingPointer = null;
    window.__status = {done: true, ok: !!ok, evidence: String(evidence || '')};
  }

  function waitFor(predicate, ms, then) {
    const request = window.__status;
    const started = Date.now();
    const tick = () => {
      if (window.__status !== request) return;
      let value = null;
      try {
        value = predicate();
      } catch (err) {
        finish(false, String(err));
        return;
      }
      if (value) {
        then(value);
        return;
      }
      if (Date.now() - started > ms) {
        then(null);
        return;
      }
      setTimeout(tick, 30);
    };
    setTimeout(tick, 0);
  }

  function surface() {
    return document.getElementById('surface');
  }

  function resetSurface() {
    const node = surface();
    node.className = 'lab-light mat-app-background';
    node.setAttribute('dir', 'ltr');
  }

  function themeDiffers() {
    const node = surface();
    node.className = 'lab-light mat-app-background';
    const light = getComputedStyle(node).backgroundColor;
    node.className = 'lab-dark mat-app-background';
    const dark = getComputedStyle(node).backgroundColor;
    const empty = !light || light === 'rgba(0, 0, 0, 0)' || !dark || dark === 'rgba(0, 0, 0, 0)';
    return {light, dark, differs: !empty && light !== dark};
  }

  function query(selector) {
    return document.querySelector(selector);
  }

  function focusNode(selector) {
    const node = query(selector);
    if (!node) return false;
    node.focus();
    return document.activeElement === node || node.contains(document.activeElement);
  }

  window.__begin = function (spec) {
    cleanup(); cleanup = () => {}; pendingPointer = null;
    window.__status = {done: false, ok: false, evidence: ''};
    const family = spec && spec.family;
    const state = spec && spec.state;
    const root = query(HOST[family] || 'missing');
    const lab = window.__lab;
    if (!lab) {
      finish(false, 'lab api missing');
      return;
    }
    if (!root) {
      finish(false, 'missing host ' + family);
      return;
    }
    try {
      lab.closeTransient();
    } catch (err) {
      finish(false, 'reset ' + err);
      return;
    }
    waitFor(
      () => !query('mat-dialog-container, .mat-menu-panel, .mat-tooltip, .mat-autocomplete-panel, .mat-select-panel, .mat-snack-bar-container'),
      800,
      () => {
        resetSurface();
        try {
          runState(family, state, root, lab);
        } catch (err) {
          finish(false, String(err));
        }
      },
    );
  };

  window.__poll = function () {
    const status = window.__status || {done: false, ok: false, evidence: ''};
    if (!status.done && pendingPointer && pendingPointer.owner === status) {
      return {...status, pointer: {id: pendingPointer.id, type: 'pointer-click', x: pendingPointer.x, y: pendingPointer.y}};
    }
    return status;
  };

  function runState(family, state, root, lab) {
    if (state === 'light' || state === 'dark') {
      const diff = themeDiffers();
      surface().className = (state === 'dark' ? 'lab-dark' : 'lab-light') + ' mat-app-background';
      finish(diff.differs && !!root, state + ' ' + diff.light + ' vs ' + diff.dark);
      return;
    }
    if (state === 'density') {
      const node = surface();
      node.className = 'lab-dense mat-app-background';
      const density = getComputedStyle(node).getPropertyValue('--lab-density').trim();
      finish(density === '-2' && !!root, 'density ' + density);
      return;
    }
    if (state === 'rtl') {
      surface().setAttribute('dir', 'rtl');
      const direction = getComputedStyle(root).direction;
      finish(direction === 'rtl', 'direction ' + direction);
      return;
    }
    if (state === 'default') return runDefault(family, root, lab);
    if (state === 'disabled') return runDisabled(family, root);
    if (state === 'invalid') return runInvalid(family, root, lab);
    if (state === 'focused') return runFocused(family, root, lab);
    finish(false, 'unhandled ' + family + '/' + state);
  }

  function runDefault(family, root, lab) {
    if (family === 'button') {
      finish(!!query('#p-button.mat-button'), 'mat-button');
      return;
    }
    if (family === 'card') {
      finish(!!query('#p-card.mat-card mat-card-title'), 'mat-card title');
      return;
    }
    if (family === 'checkbox') {
      finish(!!query('#p-checkbox.mat-checkbox'), 'mat-checkbox');
      return;
    }
    if (family === 'chips') {
      const chip = query('#p-chip-list .mat-chip'), target = query('#p-field-input');
      if (!chip || !target || typeof lab.readChipFormState !== 'function' || typeof lab.resetChipFormState !== 'function') {
        finish(false, 'chip blur fixture missing'); return;
      }
      target.focus();
      waitFor(() => lab.readChipFormState().focused === false, 1500, unfocused => {
        if (!unfocused) {finish(false, 'chip list did not reset focus'); return;}
        lab.resetChipFormState();
        chip.focus();
        waitFor(() => lab.readChipFormState().focused === true, 1500, focused => {
          if (!focused) {finish(false, 'chip list did not receive native focus'); return;}
          const before = lab.readChipFormState();
          target.focus();
          waitFor(() => {
            const state = lab.readChipFormState();
            return state.focused === false && state.touched === true ? state : null;
          }, 1500, after => {
            const observation = {focused_before: before.focused, touched_before: before.touched,
              focused_after: after && after.focused, touched_after: after && after.touched,
              dom_focus_moved: document.activeElement === target};
            finish(legacyChipBlurNativeOkay(observation), 'mat-chip-list; blur/form state ' + JSON.stringify(observation));
          });
        });
      });
      return;
    }
    if (family === 'core') {
      finish(!!query('#p-core.mat-pseudo-checkbox-checked'), 'mat-pseudo-checkbox-checked');
      return;
    }
    if (family === 'form-field') {
      if (!query('#p-field.mat-form-field #p-hint')) {finish(false, 'form field hint missing'); return;}
      const host = query('#p-outline'), wrapper = query('#p-outline-wrapper'), rows = [];
      const prefix = query('#p-outline-prefix'), hide = query('#p-outline-hide');
      const show = query('#p-outline-show'), rtl = query('#p-outline-rtl');
      if (!host || !wrapper || !prefix || !hide || !show || !rtl) {finish(false, 'outline fixture missing'); return;}
      const record = (direction, hasPrefix, then) => waitFor(() => {
        const observation = readLegacyFormFieldOutlineNative(host);
        return legacyFormFieldOutlineNativeOkay(observation) && observation.direction === direction
          && !!host.querySelector('.mat-form-field-prefix') === hasPrefix ? observation : null;
      }, 1500, observation => {
        if (!observation) {finish(false, 'outline geometry missing at ' + direction + '/' + hasPrefix); return;}
        rows.push(observation); then();
      });
      record('ltr', false, () => {
        prefix.click();
        record('ltr', true, () => {
          hide.click();
          waitFor(() => getComputedStyle(wrapper).display === 'none', 1500, hidden => {
            if (!hidden) {finish(false, 'outline hide was not rendered'); return;}
            show.click();
            record('ltr', false, () => {
              rtl.click();
              record('rtl', false, () => {
                if (!legacyFormFieldOutlineSequenceOkay(rows)) {finish(false, 'outline sequence failed'); return;}
                waitFor(() => {
                  const boundary = readLegacyFormFieldOutlineBoundaryNative(query('#p-outline-boundary'));
                  return legacyFormFieldOutlineBoundaryNativeOkay(boundary) ? boundary : null;
                }, 1500, boundary => {
                  if (!boundary) {finish(false, 'fixed long-label geometry missing'); return;}
                  waitFor(() => {
                    const state = readLegacyFormFieldNoLabelNative(query('#p-field-disabled'));
                    return legacyFormFieldNoLabelNativeOkay(state) ? state : null;
                  }, 1500, state => {
                    if (!state) {finish(false, 'tagged no-label float state missing'); return;}
                    const owner = window.__status;
                    if (!window.__lab || typeof window.__lab.runFormFieldDirectionLifetime !== 'function') {
                      finish(false, 'field direction lifetime fixture missing'); return;
                    }
                    let completed = false, observation;
                    Promise.resolve().then(() => window.__lab.runFormFieldDirectionLifetime()).then(value => {
                      observation = value; completed = true;
                    }, error => {observation = {error: String(error)}; completed = true;});
                    waitFor(() => completed ? {observation} : null, 1500, result => {
                      if (window.__status !== owner) return;
                      const lifetime = result && result.observation;
                      finish(legacyFormFieldDirectionLifetimeNativeOkay(lifetime),
                        'form-field; outline prefix/hide/show/RTL ' + JSON.stringify(rows) + '; fixed long-label boundary ' + JSON.stringify(boundary)
                        + '; tagged no-label float state ' + JSON.stringify(state) + '; direction lifetime ' + JSON.stringify(lifetime));
                    });
                  });
                });
              });
            });
          });
        });
      });
      return;
    }
    if (family === 'input') {
      finish(!!query('#p-input.mat-input-element'), 'mat-input-element');
      return;
    }
    if (family === 'list') {
      finish(!!query('#p-list .mat-list-item'), 'mat-list-item');
      return;
    }
    if (family === 'paginator') {
      finish(!!query('#wrap-paginator .mat-paginator'), 'mat-paginator');
      return;
    }
    if (family === 'progress-bar') {
      const bar = query('#p-bar.mat-progress-bar');
      finish(!!bar && bar.getAttribute('aria-valuenow') === '40', 'aria-valuenow ' + (bar && bar.getAttribute('aria-valuenow')));
      return;
    }
    if (family === 'progress-spinner') {
      const spinner = query('#p-spin.mat-progress-spinner');
      finish(!!spinner && spinner.getAttribute('aria-valuenow') === '55', 'aria-valuenow ' + (spinner && spinner.getAttribute('aria-valuenow')));
      return;
    }
    if (family === 'radio') {
      finish(!!query('#p-radio.mat-radio-button'), 'mat-radio-button');
      return;
    }
    if (family === 'slide-toggle') {
      finish(!!query('#p-toggle.mat-slide-toggle'), 'mat-slide-toggle');
      return;
    }
    if (family === 'slider') {
      const slider = query('#p-slider.mat-slider');
      finish(!!slider && slider.getAttribute('aria-valuenow') === '20', 'aria-valuenow ' + (slider && slider.getAttribute('aria-valuenow')));
      return;
    }
    if (family === 'table') {
      const text = root.textContent || '';
      finish(!!query('#p-table .mat-header-cell') && text.includes('Ada'), 'table header and cell');
      return;
    }
    if (family === 'dialog') {
      const opener = query('#p-dialog-open');
      if (opener) opener.click();
      waitFor(() => query('mat-dialog-container #dialog-body'), 1500, node => finish(!!node, 'mat-dialog-container'));
      return;
    }
    if (family === 'menu') {
      const trigger = query('#p-menu-trigger');
      if (trigger) trigger.click();
      waitFor(() => {
        const item = query('.mat-menu-panel #p-menu-item');
        return item && (document.activeElement === item || item.contains(document.activeElement)) ? item : null;
      }, 1500, node => finish(!!node, 'mat-menu-panel; automatic first-item focus'));
      return;
    }
    if (family === 'select') {
      const trigger = query('#p-select .mat-select-trigger');
      if (trigger) trigger.click();
      waitFor(() => {
        const observation = readLegacySelectFontNative(query('#p-select .mat-select-trigger'));
        return legacySelectFontNativeOkay(observation) ? observation : null;
      }, 1500, observation => finish(!!observation, 'mat-select-panel; font inheritance ' + JSON.stringify(observation)));
      return;
    }
    if (family === 'autocomplete') {
      const input = query('#p-auto');
      if (input) {
        input.focus();
        input.dispatchEvent(new FocusEvent('focus', {bubbles: false}));
        input.value = 'A';
        input.dispatchEvent(new InputEvent('input', {bubbles: true, data: 'A'}));
        input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
      }
      waitFor(() => query('.mat-autocomplete-panel .mat-option'), 1500, option => {
        if (!option) {finish(false, 'autocomplete option missing'); return;}
        if (typeof lab.readAutocompleteSelection !== 'function') {
          finish(false, 'autocomplete selection fixture API missing'); return;
        }
        const request = window.__status;
        option.click();
        waitFor(() => !query('.mat-autocomplete-panel') && input && input.value === 'a'
          && lab.readAutocompleteSelection() === 'a', 1500, selected => {
          if (window.__status === request) finish(!!selected,
            'mat-autocomplete; DOM option activation, public selection, input value, and panel closure');
        });
      });
      return;
    }
    if (family === 'tooltip') {
      const button = query('#p-tooltip'), sequence = [];
      if (button) {
        button.scrollIntoView({block: 'center'});
        button.focus();
        button.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}));
      }
      waitFor(() => {
        const observation = readLegacyTooltipNative(button);
        return legacyTooltipNativeOkay(observation, 'Hello tip') ? observation : null;
      }, 1500, first => {
        if (!first) {finish(false, 'tooltip initial geometry missing'); return;}
        sequence.push(first);
        const change = query('#p-tooltip-change');
        if (!change) {finish(false, 'tooltip message change fixture missing'); return;}
        change.click();
        waitFor(() => {
          const observation = readLegacyTooltipNative(button);
          return legacyTooltipNativeOkay(observation, 'A longer tooltip message for repositioning') ? observation : null;
        }, 1500, second => {
          if (!second) {finish(false, 'tooltip replacement geometry missing'); return;}
          sequence.push(second);
          if (typeof lab.runTooltipAriaLifetime !== 'function') {
            finish(false, 'tooltip ARIA fixture API missing'); return;
          }
          const request = window.__status;
          const complete = (ok, evidence) => {
            if (window.__status === request) finish(ok, evidence);
          };
          const timeout = setTimeout(() => complete(false, 'tooltip ARIA fixture timed out'), 1500);
          Promise.resolve().then(() => lab.runTooltipAriaLifetime()).then(observation => {
            clearTimeout(timeout);
            complete(legacyTooltipMessageSequenceOkay(sequence) && legacyTooltipAriaLifetimeNativeOkay(observation),
              'mat-tooltip; message geometry ' + JSON.stringify(sequence) + '; ARIA destruction ' + JSON.stringify(observation));
          }, error => {
            clearTimeout(timeout);
            complete(false, 'tooltip ARIA fixture ' + String(error));
          });
        });
      });
      return;
    }
    if (family === 'snack-bar') {
      const opener = query('#p-snack');
      if (opener) opener.click();
      waitFor(() => query('.mat-snack-bar-container'), 1500, node => {
        if (!node) {finish(false, 'disabled snack container missing'); return;}
        lab.closeTransient();
        waitFor(() => !query('.mat-snack-bar-container'), 1500, removed => {
          if (!removed) {finish(false, 'disabled snack did not dispose'); return;}
          runSnackMotion('event', []);
        });
      });
      return;
    }
    if (family === 'tabs') {
      const group = query('#p-tabs'), sequence = [];
      const labels = group && group.querySelectorAll('.mat-tab-label');
      if (!labels || labels.length < 2) {finish(false, 'tab labels missing'); return;}
      const observe = (index, then) => waitFor(() => {
        const observation = readLegacyInkBarNative(group);
        return legacyInkBarNativeOkay(observation) && observation.selected_index === index ? observation : null;
      }, 1500, observation => {
        if (!observation) {finish(false, 'tab ink-bar alignment missing at ' + index); return;}
        sequence.push(observation); then();
      });
      labels[0].click();
      observe(0, () => {
        labels[1].click();
        observe(1, () => {
          labels[0].click();
          observe(0, () => {
            if (!legacyInkBarSelectionSequenceOkay(sequence)) {finish(false, 'tabs ink-bar sequence failed'); return;}
            runPagination(sequence);
          });
        });
      });
      return;
    }
    finish(false, 'no default for ' + family);
  }

  function runSnackMotion(mode, observations) {
    const opener = query('#snack-motion-open');
    if (!opener) {finish(false, 'enabled snack fixture missing'); return;}
    const trace = trackLegacySnackMotionNative(mode);
    cleanup = () => trace.cleanup();
    opener.click();
    waitFor(() => {
      const before = readLegacySnackMotionEnterNative();
      return before.entered === 1 && before.enabled && before.box && before.box.width > 0 && before.box.height > 0 ? before : null;
    }, 1500, before => {
      if (!before) {finish(false, 'enabled snack did not enter: ' + mode); return;}
      const button = query('.mat-snack-bar-container .mat-simple-snackbar-action button');
      if (!button) {finish(false, 'enabled snack action missing'); return;}
      pointerClick(button, () => waitFor(() => {
        const observation = {mode, enabled: before.enabled, entered: before.entered, enter_ms: before.enter_ms,
          ...readLegacySnackMotionExitNative(trace)};
        return observation.trusted_action_events === 1 && legacySnackMotionNativeOkay(observation) ? observation : null;
      }, 1500, observation => {
        if (!observation) {finish(false, 'enabled snack completion failed: ' + mode); return;}
        trace.cleanup(); cleanup = () => {};
        observations.push(observation);
        if (mode === 'event') runSnackMotion('fallback', observations);
        else runSnackAnnouncement(observations);
      }));
    });
  }

  function runSnackAnnouncement(motion) {
    const owner = window.__status;
    if (!window.__lab || typeof window.__lab.runSnackAnnouncementLifetime !== 'function') {
      finish(false, 'snack announcement fixture missing'); return;
    }
    let completed = false, observation;
    Promise.resolve().then(() => window.__lab.runSnackAnnouncementLifetime()).then(value => {
      observation = value; completed = true;
    }, error => {observation = {error: String(error)}; completed = true;});
    waitFor(() => completed ? {observation} : null, 3500, result => {
      if (window.__status !== owner) return;
      const announcement = result && result.observation;
      finish(motion.length === 2 && legacySnackAnnouncementLifetimeNativeOkay(announcement),
        'snack; trusted CSS event and suppressed-event fallback ' + JSON.stringify(motion)
        + '; live/direct-destroy announcement ' + JSON.stringify(announcement));
    });
  }

  function runPagination(inkSequence) {
    const group = query('#p-pagination-tabs');
    waitFor(() => {
      const observation = readTabPaginationNative(group);
      return !observation.missing && observation.elements === 2 && observation.button_semantics &&
        observation.scroll === 0 && observation.after_box.width > 0 && observation.after_box.height > 0 ? observation : null;
    }, 1500, initial => {
      if (!initial) {finish(false, 'pagination initial geometry or semantics missing'); return;}
      const before = group.querySelector('.mat-tab-header-pagination-before');
      const after = group.querySelector('.mat-tab-header-pagination-after');
      const label = group.querySelector('.mat-tab-label');
      before.click();
      const owner = window.__status;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (window.__status !== owner) return;
        const inert = readTabPaginationNative(group).scroll === initial.scroll;
        if (!inert || !label || !after) {finish(false, 'disabled pagination changed scroll'); return;}
        label.focus();
        waitFor(() => document.activeElement === label, 500, focused => {
          if (!focused) {finish(false, 'pagination label did not focus'); return;}
          let trustedClicks = 0;
          const request = window.__status;
          const clicked = event => {if (window.__status === request && event.isTrusted) trustedClicks++;};
          after.addEventListener('click', clicked);
          cleanup = () => after.removeEventListener('click', clicked);
          pointerClick(after, () => waitFor(() => {
            const end = readTabPaginationNative(group);
            const observation = {elements: initial.elements, button_semantics: initial.button_semantics,
              disabled_click_inert: !!inert, pointer_focus_retained: end.focus_retained,
              scroll_before: initial.scroll, scroll_after: end.scroll};
            return trustedClicks === 1 && tabPaginationNativeOkay(observation) ? observation : null;
          }, 1500, observation => finish(!!observation,
            'tabs; ink-bar sequence ' + JSON.stringify(inkSequence) + '; trusted pagination ' + JSON.stringify(observation))));
        });
      }));
    });
  }

  function runDisabled(family) {
    const checks = {
      autocomplete: '#p-auto-disabled[disabled]',
      button: '#p-button-disabled.mat-button-disabled',
      checkbox: '#p-checkbox-disabled.mat-checkbox-disabled',
      chips: '#wrap-chips .mat-chip-list-disabled',
      'form-field': '#p-field-disabled.mat-form-field-disabled',
      input: '#p-input-disabled-field.mat-form-field-disabled',
      list: '#p-list-disabled.mat-list-item-disabled',
      menu: '#p-menu-disabled[disabled][aria-disabled="true"]',
      paginator: '#p-paginator-disabled .mat-paginator-navigation-next[disabled]',
      radio: '#p-radio-disabled.mat-radio-disabled',
      select: '#p-select-disabled.mat-select-disabled',
      'slide-toggle': '#p-toggle-disabled.mat-disabled',
      slider: '#p-slider-disabled.mat-slider-disabled',
      tabs: '#wrap-tabs .mat-tab-disabled',
    };
    if (family === 'tooltip') {
      const button = query('#p-tooltip-off');
      if (button) {
        button.focus();
        button.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}));
      }
      waitFor(() => true, 200, () => {
        const tip = query('.mat-tooltip');
        const text = tip ? tip.textContent || '' : '';
        finish(!text.includes('Nope'), text ? 'tooltip text ' + text : 'disabled tooltip stayed closed');
      });
      return;
    }
    const selector = checks[family];
    if (!selector) {
      finish(false, 'no disabled check for ' + family);
      return;
    }
    finish(!!query(selector), selector);
  }

  function runInvalid(family, _root, lab) {
    if (family === 'checkbox' || family === 'radio' || family === 'slide-toggle') {
      const selector = family === 'checkbox'
        ? '#p-checkbox-invalid input'
        : family === 'radio'
          ? '#p-radio-invalid input'
          : '#p-toggle-invalid input';
      const input = query(selector);
      const missing = !!(input && input.validity && input.validity.valueMissing);
      const described = input
        ? ' valueMissing=' + missing + ' required=' + input.required + ' checked=' + input.checked + ' name=' + (input.getAttribute('name') || '')
        : ' missing';
      finish(missing, selector + described);
      return;
    }
    if (family === 'slider') {
      const button = query('#p-slider-invalidate');
      if (button) button.click();
      waitFor(() => {
        const flag = query('#slider-invalid');
        return flag && flag.textContent.trim() === 'true' ? flag : null;
      }, 1000, node => finish(!!node, 'slider ngModel invalid'));
      return;
    }
    const mark = query('#p-mark-invalid');
    if (mark) mark.click();
    const selectors = {
      autocomplete: '#p-auto-field.mat-form-field-invalid',
      chips: '#wrap-chips .mat-chip-list-invalid',
      'form-field': '#p-field.mat-form-field-invalid',
      input: '#p-input-field.mat-form-field-invalid',
      select: '#p-select.mat-select-invalid',
    };
    const selector = selectors[family];
    if (!selector) {
      finish(false, 'no invalid check for ' + family);
      return;
    }
    waitFor(() => query(selector), 1000, node => finish(!!node, selector));
  }

  function runFocused(family, _root, lab) {
    if (family === 'dialog') {
      const opener = query('#p-dialog-open');
      if (opener) opener.click();
      waitFor(() => {
        const active = document.activeElement;
        if (!active || active.id === 'p-dialog-open') return null;
        if (active.closest && active.closest('.cdk-overlay-container, mat-dialog-container')) return active.id || active.tagName;
        return null;
      }, 1500, value => finish(!!value, 'dialog focus ' + value));
      return;
    }
    if (family === 'menu') {
      const trigger = query('#p-menu-trigger');
      if (trigger) trigger.click();
      waitFor(() => query('.mat-menu-panel #p-menu-item'), 1500, node => {
        if (!node) {
          finish(false, 'menu item missing');
          return;
        }
        const landed = () => {
          const active = document.activeElement;
          if (!active) return '';
          if (active.id === 'p-menu-item' || (active.closest && active.closest('.mat-menu-panel'))) {
            return active.id || String(active.className || active.tagName);
          }
          return '';
        };
        const already = landed();
        if (!already) node.focus();
        const described = landed();
        finish(!!described && node.classList.contains('mat-menu-item'), 'menu focus ' + (described || 'null'));
      });
      return;
    }
    if (family === 'snack-bar') {
      const opener = query('#p-snack');
      if (opener) opener.click();
      waitFor(() => query('.mat-snack-bar-container .mat-simple-snackbar-action button'), 1500, node => {
        if (!node) {
          finish(false, 'snack action missing');
          return;
        }
        node.focus();
        const active = document.activeElement;
        const inside = !!(active && active.closest && active.closest('.mat-snack-bar-container'));
        finish(inside, 'snack focus ' + (inside ? (active.textContent || '').trim() : 'null'));
      });
      return;
    }
    const focusers = {
      autocomplete: '#p-auto',
      button: '#p-button-focus',
      checkbox: '#p-checkbox input',
      chips: '#wrap-chips .mat-chip-list',
      'form-field': '#p-field-input',
      input: '#p-input',
      list: '#p-list-focus',
      paginator: '#wrap-paginator .mat-paginator-navigation-next',
      radio: '#p-radio input',
      select: '#p-select',
      'slide-toggle': '#p-toggle input',
      slider: '#p-slider',
      tabs: '#wrap-tabs .mat-tab-label',
      tooltip: '#p-tooltip',
      table: '#p-table-focus',
    };
    const selector = focusers[family];
    if (!selector) {
      finish(false, 'no focused check for ' + family);
      return;
    }
    const focused = focusNode(selector);
    const active = document.activeElement;
    const described = active ? (active.id || active.className || active.tagName) : 'none';
    if (family === 'form-field' || family === 'input') {
      const field = family === 'form-field' ? '#p-field.mat-focused' : '#p-input-field.mat-focused';
      waitFor(() => query(field), 1000, node => finish(!!node && focused, field + ' active ' + described));
      return;
    }
    finish(focused, selector + ' active ' + described);
  }
})();
