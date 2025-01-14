import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { customElement } from '@polymer/decorators';

@customElement('tree-view')
export class TreeView extends PolymerElement {
  items: any;
  _index: number;
  _previouslySelected: HTMLInputElement;

  static get template() {
    return html`
      <style>
        :host {
          --horz-margin: 20px;
          --vert-margin: 0px;
          --horz-shift: calc(var(--horz-margin) / 2); /* typically */
          --vert-shift: 12px;

          display: inline-block;
          position: relative;
          width: 100%;
          height: 100%;
          background: var(--dark-grey);
          overflow-y: auto;
          padding-bottom: 60px;
        }
        button {
          border: none;
          font-size: 13px;
          display: block;
          padding: 4px 0;
          cursor: pointer;
          width: 100%;
          text-align: left;
          display: inline-block;
          margin: 0;
          background: var(--dark-grey);
          position: relative;
          color: white;
        }
        button:hover, button:focus {
          background: var(--light-grey);
        }
        span {
          margin: 4px;
        }
        .id {
          font-style: italic;
          color: var(--highlight-pink);
        }
        .selected {
          background: var(--light-grey);
          outline: none;
        }

        li, ul {
          margin: 0;
          padding: 0;
        }
        .tree ul {
          margin-left: var(--horz-margin);
        }
        .tree li {
          list-style-type: none;
          margin-top: var(--vert-margin);
          margin-bottom: var(--vert-margin);
          position: relative;
        }

        /* up connector */
        .tree li::before {
            content: "";
            position: absolute;
            top: calc(0px - var(--vert-margin));
            left: calc(var(--horz-shift) - var(--horz-margin));
            width: calc(var(--horz-margin) - var(--horz-shift));
            height: calc(var(--vert-shift) + var(--vert-margin));
            border-left: 1px solid #ccc;
            border-bottom: 1px solid #ccc;
            border-radius: 0;
        }

        /* down connector */
        .tree li::after {
            position: absolute;
            content: "";
            top: var(--vert-shift);
            left: calc(var(--horz-shift) - var(--horz-margin));
            width: calc(var(--horz-margin) - var(--horz-shift));
            height: calc(100% - var(--vert-shift));
            border-left: 1px solid #ccc;
            border-top: 1px solid #ccc;
            border-radius: 0;
        }

        /* do not draw: up connector of first root item */
        ul.tree>li:first-child::before { display:none; }

        /* do not draw: down connector of last item */
        .tree li:last-child::after  { display:none; }

        /* draw rounded: down connector of first root item */
        ul.tree>li:first-child::after { border-radius: 5px 0 0 0; }

        /* draw rounded: up connector of last item */
        .tree li:last-child:before { border-radius: 0 0 0 5px; }
      </style>
      <div id="tree"></div>
    `;
  }

  ready() {
    super.ready();
    this.$.tree.addEventListener('click', this.findElement.bind(this));
  }

  recomputeTree(parent, active) {
    this.$.tree.innerHTML = '';
    let ul = document.createElement('ul');
    ul.classList.add('tree');
    this.$.tree.appendChild(ul);

    // Since we can't add a pojo to each button, generate a new index for
    // each button in the this.items array of useful data.

    this._index = 0;
    this.items = this.getChildren(parent, ul);
    this.highlight(active);
    return this.items;
  }

  _makeButton(tag, id, index) {
    let aButton = document.createElement('button');
    aButton.dataset.index = index;
    let aTag = document.createElement('span');
    aTag.className = 'tag';
    aTag.textContent = tag;
    let aId = document.createElement('span');
    aId.className = 'id';
    aId.textContent = id;
    aButton.appendChild(aTag);
    aButton.appendChild(aId);
    return aButton;
  }

  getChildren(item, list) {
    // Add item and its children into nested ul list

    let isViewContainer = item.id === 'viewContainer';
    let data = {
      tag: isViewContainer ? 'main-app': item.tagName.toLowerCase(),
      id: isViewContainer ? '' : (item.id ? '#' + item.id : ''),
      text: isViewContainer ? '' : '"' + item.textContent + '"',
      ref: item,
      index: this._index
    };

    // Add item to list
    let li = document.createElement('li');
    let button = this._makeButton(data.tag, data.id, data.index);
    li.appendChild(button);
    list.appendChild(li);

    this._index++;
    let nodes = [data];

    // Add children to subordinate list
    let ul = null;
    for (let i = 0; i < item.children.length; i++) {
      let child = item.children[i];

      // Skip <style> nodes;
      if (child.localName === 'style') {
        continue;
      }

      if (ul == null) { 
        ul = document.createElement('ul');
        li.appendChild(ul);         
      }
      nodes = nodes.concat(this.getChildren(child, ul));
    }

    return nodes;
  }

  findElement(event) {
    // If the target is a <span>, you clicked on the span inside the button
    // so you need to use currentTarget.
    let item = event.target;
    if (item.tagName === 'SPAN') {
      item = item.parentElement;
    }
    this.selectTreeElement(item);

    // Find the actual element it points to.
    let index = item.dataset.index;
    let el = this.items[index].ref;
    el.click();
  }

  selectTreeElement(item) {
    if (this._previouslySelected) {
      this._previouslySelected.classList.remove('selected');
    }
    this._previouslySelected = item;
    item.classList.add('selected');
  }

  highlight(element) {
    // Find it in the tree.
    let buttons = this.root.querySelectorAll('button');
    if (buttons.length !== this.items.length) {
      return;
    }

    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].ref === element) {
        this.selectTreeElement(buttons[i]);
        return;
      }
    }
  }
}
