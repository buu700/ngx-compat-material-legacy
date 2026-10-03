/**
 * Owned test-event helpers. Specs must not import `@angular/cdk/testing/private`,
 * which is not a public CDK 22 export.
 */
import {EventEmitter, NgZone} from '@angular/core';

export interface OwnedModifierKeys {
  control?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

export class MockNgZone extends NgZone {
  constructor() {
    super({enableLongStackTrace: false});
  }

  override run<T>(fn: (...args: any[]) => T, applyThis?: any, applyArgs?: any[]): T {
    return fn.apply(applyThis, applyArgs);
  }

  override runOutsideAngular<T>(fn: (...args: any[]) => T): T {
    return fn();
  }

  simulateZoneExit(): void {
    (this.onStable as EventEmitter<any>).emit(null);
  }
}

export function dispatchEvent<T extends Event>(node: Node | Window, event: T): T {
  node.dispatchEvent(event);
  return event;
}

export function createFakeEvent(type: string, bubbles = false, cancelable = true): Event {
  return new Event(type, {bubbles, cancelable, composed: true});
}

export function dispatchFakeEvent(node: Node | Window, type: string, bubbles?: boolean): Event {
  return dispatchEvent(node, createFakeEvent(type, bubbles ?? false));
}

function eventView(): Window | undefined {
  return typeof window !== 'undefined' ? window : undefined;
}

function defineReadonly(event: Event, name: string, value: unknown): void {
  Object.defineProperty(event, name, {get: () => value, configurable: true});
}

export function createKeyboardEvent(
  type: string,
  keyCode = 0,
  key = '',
  modifiers: OwnedModifierKeys = {},
  code = '',
): KeyboardEvent {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: eventView(),
    key,
    code,
    shiftKey: !!modifiers.shift,
    metaKey: !!modifiers.meta,
    altKey: !!modifiers.alt,
    ctrlKey: !!modifiers.control,
  });
  // The constructor does not set keyCode. Listeners in these specs read it.
  defineReadonly(event, 'keyCode', keyCode);
  defineReadonly(event, 'which', keyCode);
  if (key) {
    defineReadonly(event, 'key', key);
  }
  return event;
}

export function dispatchKeyboardEvent(
  node: Node,
  type: string,
  keyCode?: number,
  key?: string,
  modifiers?: OwnedModifierKeys,
  code?: string,
): KeyboardEvent {
  return dispatchEvent(
    node,
    createKeyboardEvent(type, keyCode ?? 0, key ?? '', modifiers ?? {}, code ?? ''),
  );
}

export function createMouseEvent(
  type: string,
  clientX = 0,
  clientY = 0,
  offsetX?: number,
  offsetY?: number,
  button = 0,
  modifiers: OwnedModifierKeys = {},
): MouseEvent {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: eventView(),
    screenX: clientX,
    screenY: clientY,
    clientX,
    clientY,
    ctrlKey: !!modifiers.control,
    altKey: !!modifiers.alt,
    shiftKey: !!modifiers.shift,
    metaKey: !!modifiers.meta,
    button,
    buttons: 1,
  });
  if (offsetX != null) {
    defineReadonly(event, 'offsetX', offsetX);
  }
  if (offsetY != null) {
    defineReadonly(event, 'offsetY', offsetY);
  }
  return event;
}

export function dispatchMouseEvent(
  node: Node,
  type: string,
  clientX = 0,
  clientY = 0,
  offsetX?: number,
  offsetY?: number,
  button?: number,
  modifiers?: OwnedModifierKeys,
): MouseEvent {
  return dispatchEvent(
    node,
    createMouseEvent(type, clientX, clientY, offsetX, offsetY, button, modifiers),
  );
}

export function createTouchEvent(type: string, pageX = 0, pageY = 0, clientX = 0, clientY = 0): Event {
  const event = new Event(type, {bubbles: true, cancelable: true, composed: true});
  const touch = {pageX, pageY, clientX, clientY, identifier: 0};
  defineReadonly(event, 'touches', [touch]);
  defineReadonly(event, 'targetTouches', [touch]);
  defineReadonly(event, 'changedTouches', [touch]);
  return event;
}

export function patchElementFocus(element: HTMLElement): void {
  element.focus = () => {
    dispatchFakeEvent(element, 'focus');
  };
  element.blur = () => {
    dispatchFakeEvent(element, 'blur');
  };
}

function triggerFocus(element: HTMLElement): void {
  let fired = false;
  const handler = () => {
    fired = true;
  };
  element.addEventListener('focus', handler);
  element.focus();
  element.removeEventListener('focus', handler);
  if (!fired) {
    dispatchFakeEvent(element, 'focus');
  }
}

export function clearElement(element: HTMLInputElement | HTMLTextAreaElement): void {
  triggerFocus(element);
  element.value = '';
  dispatchFakeEvent(element, 'input');
}

function keyboardCode(char: string): string {
  if (char.length !== 1) {
    return '';
  }
  const code = char.charCodeAt(0);
  if ((code >= 97 && code <= 122) || (code >= 65 && code <= 90)) {
    return `Key${char.toUpperCase()}`;
  }
  if (code >= 48 && code <= 57) {
    return `Digit${char}`;
  }
  return char === ' ' ? 'Space' : '';
}

export function typeInElement(element: HTMLElement, ...keys: string[]): void {
  const chars = keys.join('').split('');
  if (chars.length === 0) {
    throw new Error('No keys have been specified.');
  }
  const isInput = element.nodeName === 'INPUT' || element.nodeName === 'TEXTAREA';
  triggerFocus(element);
  for (const char of chars) {
    const keyCode = char.toUpperCase().charCodeAt(0);
    dispatchKeyboardEvent(element, 'keydown', keyCode, char, {}, keyboardCode(char));
    dispatchKeyboardEvent(element, 'keypress', keyCode, char, {}, keyboardCode(char));
    if (isInput) {
      (element as HTMLInputElement).value += char;
      dispatchFakeEvent(element, 'input');
    }
    dispatchKeyboardEvent(element, 'keyup', keyCode, char, {}, keyboardCode(char));
  }
}

export function wrappedErrorMessage(error: Error): RegExp {
  const escaped = error.message.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  return new RegExp(escaped);
}

