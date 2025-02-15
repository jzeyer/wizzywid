import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { customElement } from '@polymer/decorators';
import { ElementStuffBase } from './element-stuff-base.js';

import './element-stuff-base.js';
import './element-stuff-shared-styles.js';

@customElement('element-stuff-properties')
export class ElementProperties extends ElementStuffBase(PolymerElement) {
  static get template() {
    return html`
      <style include="element-stuff-shared-styles"></style>
      <div class="content-wrapper">
        <div>
          <label for="textContent">textContent</label>
          <input name="textContent" id="textContent">
          <label for="id">id</label>
          <input name="id" id="id">
          <label for="slot">slot</label>
          <input name="slot" id="slot">
          <label for="classList">classList</label>
          <input name="classList" id="classList">
        </div>
        <div id="bonus"></div>
      </div>
    `;
  }

  constructor() {
    super();
    this.stuffType = 'property';
  }

  display(target) {
    this._displayBasicProperties(target);
    this.$.bonus.innerHTML = '';

    // If this is the top level div, we don't want any other properties shown.
    if (target.id === 'viewContainer') {
      return;
    }

    // If this is a native element, then start walking up the prototype
    // chain to get all the props it has. If it's a custom element,
    // then assume it's a v1 element and look at its observedAttributes
    let attrNames = window.getAttributesIfCustomElement(target);
    this._displayPropsOrAttributes(target, attrNames, true);

    let propNames = window.getProtoProperties(target);
    this._displayPropsOrAttributes(target, propNames);
  }

  _displayBasicProperties(target) {
    for (let i = 0; i < this._stuff.length; i++) {
      let prop = this._stuff[i];
      let el = this.root.querySelector(`[name=${prop}]`) as HTMLInputElement;
      // Ugh
      if (prop === 'attributes') {
        let v = '';
        for(let a = 0; a < target.attributes.length; a++) {
          let name = target.attributes[a].name;
          if (name != 'class' && name != 'style' && name != 'id') {
            v += name + '=' + target.attributes[a].value + ' ';
          }
        }
        el.value = v.trim();
      } else if (prop === 'classList') {
        // Lol what's a blacklist.
        el.value = target[prop].toString().replace('active', '').replace('dragging', '').replace('resizing', '');
        if (target.id === 'viewContainer') {
          el.value = el.value.replace('iron-selected', '');
        }
      } else if (prop === 'textContent') {
        // If this element has children, then disable textContent since
        // changing it will only lead to surprise tears.
        if (target.children.length !== 0) {
          el.value = '';
          el.disabled = true;
        } else {
          el.value = target[prop];
          el.disabled = false;
        }
      } else {
        el.value = target[prop];
      }
    }
  }

  _displayPropsOrAttributes(target, propNames, isAttribute = false) {
    for (let i = 0; i < propNames.length; i++) {
      let name = propNames[i];
      // Ignore things that start with a _. Polymer converts every property
      // to an observed attribute, so you might get a lot of private
      // things in here.
      if (name.indexOf('_') === 0) {
        continue;
      }

      let label = document.createElement('label');
      label.textContent = name;
      label.setAttribute('for', name);
      // label.htmlFor = name;
      this.$.bonus.appendChild(label);
      let input = document.createElement('input');
      input.name = name;
      input.setAttribute('id', name);
      if (isAttribute) {
        input.classList.add('attribute');
        if (name === 'items' && target.localName === 'dom-repeat') {
          // We did a giant hack for dom-repeats where we can't actually set
          // the items property, since that would immediately stamp the children,
          // so instead we set fakeItemsAttr as a convention (see
          // app-shell::updateActiveElementValues). Anyway, fake display it
          // correctly here.
          input.value = target.dataset['fakeItemsAttr'] || '';
        } else {
          input.value = target.getAttribute(name) || '';
        }
      } else {
        input.value = target[name] || '';
      }
      this.$.bonus.appendChild(input);
    }
  }
}
