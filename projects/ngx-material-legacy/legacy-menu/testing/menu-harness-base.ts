/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * Owned Material-16 `_MatMenuHarnessBase` / `_MatMenuItemHarnessBase`
 * (removed from Angular Material 22).
 */

import {
  BaseHarnessFilters,
  ComponentHarness,
  ComponentHarnessConstructor,
  ContentContainerComponentHarness,
  HarnessLoader,
  HarnessPredicate,
  TestElement,
  TestKey,
} from '@angular/cdk/testing';
import {coerceBooleanProperty} from '@angular/cdk/coercion';

export abstract class _MatMenuHarnessBase<
  ItemType extends ComponentHarnessConstructor<Item> & {
    with: (options?: ItemFilters) => HarnessPredicate<Item>;
  },
  Item extends ComponentHarness & {
    click(): Promise<void>;
    getSubmenu(): Promise<_MatMenuHarnessBase<ItemType, Item, ItemFilters> | null>;
  },
  ItemFilters extends BaseHarnessFilters,
> extends ContentContainerComponentHarness<string> {
  private _documentRootLocator = this.documentRootLocatorFactory();
  protected abstract _itemClass: ItemType;

  async isDisabled(): Promise<boolean> {
    const disabled = (await this.host()).getAttribute('disabled');
    return coerceBooleanProperty(await disabled);
  }

  async isOpen(): Promise<boolean> {
    return !!(await this._getMenuPanel());
  }

  async getTriggerText(): Promise<string> {
    return (await this.host()).text();
  }

  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  async blur(): Promise<void> {
    return (await this.host()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  async open(): Promise<void> {
    if (!(await this.isOpen())) {
      return (await this.host()).click();
    }
  }

  async close(): Promise<void> {
    const panel = await this._getMenuPanel();
    if (panel) {
      return panel.sendKeys(TestKey.ESCAPE);
    }
  }

  async getItems(filters?: Omit<ItemFilters, 'ancestor'>): Promise<Item[]> {
    const panelId = await this._getPanelId();
    if (panelId) {
      return this._documentRootLocator.locatorForAll(
        this._itemClass.with({
          ...(filters || {}),
          ancestor: `#${panelId}`,
        } as ItemFilters),
      )();
    }
    return [];
  }

  async clickItem(
    itemFilter: Omit<ItemFilters, 'ancestor'>,
    ...subItemFilters: Omit<ItemFilters, 'ancestor'>[]
  ): Promise<void> {
    await this.open();
    const items = await this.getItems(itemFilter);
    if (!items.length) {
      throw Error(`Could not find item matching ${JSON.stringify(itemFilter)}`);
    }

    if (!subItemFilters.length) {
      return await items[0].click();
    }

    const menu = await items[0].getSubmenu();
    if (!menu) {
      throw Error(`Item matching ${JSON.stringify(itemFilter)} does not have a submenu`);
    }
    return menu.clickItem(...(subItemFilters as [Omit<ItemFilters, 'ancestor'>]));
  }

  protected override async getRootHarnessLoader(): Promise<HarnessLoader> {
    const panelId = await this._getPanelId();
    return this.documentRootLocatorFactory().harnessLoaderFor(`#${panelId}`);
  }

  private async _getMenuPanel(): Promise<TestElement | null> {
    const panelId = await this._getPanelId();
    return panelId ? this._documentRootLocator.locatorForOptional(`#${panelId}`)() : null;
  }

  private async _getPanelId(): Promise<string | null> {
    const panelId = await (await this.host()).getAttribute('aria-controls');
    return panelId || null;
  }
}

export abstract class _MatMenuItemHarnessBase<
  MenuType extends ComponentHarnessConstructor<Menu>,
  Menu extends ComponentHarness,
> extends ContentContainerComponentHarness<string> {
  protected abstract _menuClass: MenuType;

  async isDisabled(): Promise<boolean> {
    const disabled = (await this.host()).getAttribute('disabled');
    return coerceBooleanProperty(await disabled);
  }

  async getText(): Promise<string> {
    return (await this.host()).text();
  }

  async focus(): Promise<void> {
    return (await this.host()).focus();
  }

  async blur(): Promise<void> {
    return (await this.host()).blur();
  }

  async isFocused(): Promise<boolean> {
    return (await this.host()).isFocused();
  }

  async click(): Promise<void> {
    return (await this.host()).click();
  }

  async hasSubmenu(): Promise<boolean> {
    return (await this.host()).matchesSelector(this._menuClass.hostSelector);
  }

  async getSubmenu(): Promise<Menu | null> {
    if (await this.hasSubmenu()) {
      return new this._menuClass(this.locatorFactory);
    }
    return null;
  }
}
