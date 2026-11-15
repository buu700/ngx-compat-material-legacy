/** @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT. */
/** These are synthetic browser observations, not trusted key input or navigation. */
export function browserKeycodeObservationOkay(kind, value) {
  if (!value || typeof value !== 'object') return false;
  if (kind === 'tabs') {
    return [13, 32].every(key => ['enabled', 'disabled', 'no-panel'].every(name => {
      const item = value.cases?.[name + '-' + key];
      return !!item && item.prevented === (name === 'disabled') &&
        item.clicks === (name === 'enabled' ? 1 : 0) && item.active === (name === 'enabled');
    }));
  }
  if (kind !== 'tooltip' && kind !== 'select') return false;
  if (![value.opened, value.prevented, value.closed, value.reopened, value.destroyed].every(x => x === true)) return false;
  if (!['alt', 'ctrl', 'shift', 'meta'].every(name => value.modified?.[name]?.prevented === false && value.modified?.[name]?.open === true)) return false;
  return kind !== 'tooltip' || JSON.stringify(value.keysBeforeDestroy) === '[65,27,27,27,27]' &&
    JSON.stringify(value.keysAfterDestroy) === '[65,27,27,27,27,66]';
}

/** The tooltip geometry oracle assumes a below/center placement with room for the tagged 250px maximum width and margins. */
export function tooltipFixtureRoomOkay(room) {
  return !!room && [room.center, room.bottom, room.viewportWidth, room.viewportHeight].every(Number.isFinite) &&
    room.center >= 160 && room.viewportWidth - room.center >= 160 &&
    room.bottom >= 0 && room.viewportHeight - room.bottom >= 120;
}
