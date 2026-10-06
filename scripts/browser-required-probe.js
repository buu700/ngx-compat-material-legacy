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

  function finish(ok, evidence) {
    if (window.__status && window.__status.done) return;
    window.__status = {done: true, ok: !!ok, evidence: String(evidence || '')};
  }

  function waitFor(predicate, ms, then) {
    const started = Date.now();
    const tick = () => {
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
    return window.__status || {done: false, ok: false, evidence: ''};
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
      finish(!!query('#wrap-chips .mat-chip-list .mat-chip'), 'mat-chip-list');
      return;
    }
    if (family === 'core') {
      finish(!!query('#p-core.mat-pseudo-checkbox-checked'), 'mat-pseudo-checkbox-checked');
      return;
    }
    if (family === 'form-field') {
      finish(!!query('#p-field.mat-form-field #p-hint'), 'form field hint');
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
      waitFor(() => query('.mat-menu-panel #p-menu-item'), 1500, node => finish(!!node, 'mat-menu-panel'));
      return;
    }
    if (family === 'select') {
      const trigger = query('#p-select .mat-select-trigger');
      if (trigger) trigger.click();
      waitFor(() => query('.mat-select-panel'), 1500, node => finish(!!node, 'mat-select-panel'));
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
      waitFor(() => query('.mat-autocomplete-panel'), 1500, node => finish(!!node, 'mat-autocomplete-panel'));
      return;
    }
    if (family === 'tooltip') {
      const button = query('#p-tooltip');
      if (button) {
        button.focus();
        button.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}));
      }
      waitFor(() => {
        const tip = query('.mat-tooltip');
        return tip && (tip.textContent || '').includes('Hello tip') ? tip : null;
      }, 1500, node => finish(!!node, 'mat-tooltip'));
      return;
    }
    if (family === 'snack-bar') {
      const opener = query('#p-snack');
      if (opener) opener.click();
      waitFor(() => query('.mat-snack-bar-container'), 1500, node => finish(!!node, 'mat-snack-bar-container'));
      return;
    }
    if (family === 'tabs') {
      lab.selectSecondTab();
      waitFor(() => {
        const labels = document.querySelectorAll('#wrap-tabs .mat-tab-label');
        return labels[1] && labels[1].getAttribute('aria-selected') === 'true' ? labels[1] : null;
      }, 1500, node => finish(!!node, 'second tab selected'));
      return;
    }
    finish(false, 'no default for ' + family);
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
