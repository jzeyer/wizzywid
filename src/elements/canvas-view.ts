import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { customElement } from '@polymer/decorators';
import { addListener } from '@polymer/polymer/lib/utils/gestures.js';
import { ActionHistory } from './action-history';

import '@polymer/polymer/lib/mixins/gesture-event-listeners.js';

@customElement('canvas-view')
export class CanvasView extends PolymerElement {
  actionHistory: ActionHistory;
  selectedElement: HTMLElement;
  _justFinishedDraggingOrDropping: boolean;
  _resizing: boolean;
  _dropTarget: Element;
  _initialWidth: number;
  _initialHeight: number;
  _gridSize = 10;
  _alignOnGrid = true;

  static get template() {
    return html`
    <style>
      :host {
        display: block;
        box-sizing: border-box;
        width: 100%;
        position: relative;
        background-color: var(--canvas-background);
        /* 10px grid, using http://www.patternify.com/ */
        background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAIElEQVQoU2NkYGBIY2BgmMVAADASUgCTH1WIN6SIDh4AnhABC01te2MAAAAASUVORK5CYII=);
        background-position: 0px 0px;
        transform: translateZ(0);
      }
      #canvas {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
      }

      #canvas > dom-repeat {
        height: 20px;
        width: 20px;
        display: inline-block;
      }
      #canvas * {
        cursor: pointer;
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
      }
      #canvas *:not(.active):hover {
        outline: solid 2px #90CAF9 !important;
        outline-offset: 2px;
      }
      .active, :host(.active) {
        outline: solid 3px var(--highlight-blue) !important;
        outline-offset: 2px;
        transform: translateZ(0);
      }
      :host(.active) {
        outline-offset: -3px;
      }

      /* Show a resize cursor in the corner */
      .active:after {
        position: absolute;
        bottom: -5px;
        right: -5px;
        height: 14px;
        width: 14px;
        content: '↘';
        cursor: se-resize;
        font-size: 10px;
        font-weight: bold;
        text-align: center;
        background: var(--highlight-blue);
        color: white;
      }
      .dragging, .resizing {
        user-select: none;
        -moz-user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
      }
      .dragging {
        /*opacity: 0.6;*/
        z-index: 1000;
        cursor: move;
      }
      .dragging.active:after {
        display: none;
      }
      .resizing {
        cursor: se-resize;
      }
      .over {
        outline: dashed 3px var(--highlight-blue) !important;
        outline-offset: 2px;
      }
      .over::before {
        content: 'press "alt" to enter container';
        top: 5px;
        left: 5px;
        position: absolute;
        opacity: 0.5;
      }
    </style>
    <div id="canvas"></div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    addListener(this.$.canvas, 'down', this.downOnElement.bind(this));
    addListener(this.$.canvas, 'track', this.trackElement.bind(this));
    this.addEventListener('click', event => {
      this.updateActiveElement(this);
    });
    this.$.canvas.addEventListener('click', (event: CustomEvent) => {
      // If this element is a link, it will actually do a navigation, so, don't.
      event.preventDefault();
      event.stopImmediatePropagation();
      if ((event.target as HTMLElement).id === 'canvas' && !this._justFinishedDraggingOrDropping) {
        this.updateActiveElement(this);
      } else {
        this.updateActiveElement(event.target);
      }
    });

    window.addEventListener('keydown', this.onKeyDown.bind(this), true);
  }

  add(el) {
    this.$.canvas.appendChild(el);
  }

  removes(el) {
    this.$.canvas.removeChild(el);
  }

  has(query) {
    return this.$.canvas.querySelector(query);
  }

  setInnerHTML(thing) {
    this.$.canvas.innerHTML = thing;
  }

  getInnerHTML() {
    return this.$.canvas.innerHTML;
  }

  get children() {
    return this.$.canvas.children;
  }

  updateActiveElement(el) {
    this.selectedElement = el;
    this.dispatchEvent(new CustomEvent('selected-element-changed', { bubbles: true, composed: true, detail: { target: el, node: this } }));
    this.dispatchEvent(new CustomEvent('refresh-view', { bubbles: true, composed: true, detail: { node: this } }));
  }

  downOnElement(event) {
    let el = event.target;
    this._justFinishedDraggingOrDropping = false;
    if (el === this || el === this.$.canvas) {
      return;
    }

    let rekt = el.getBoundingClientRect();
    let shouldResize = this.dragShouldSize(event, rekt);
    if (shouldResize) {
      this._resizing = true;
      this._initialWidth = rekt.width;
      this._initialHeight = rekt.height;
      el.classList.add('resizing');
      el.classList.add('active');
    }
  }

  trackElement(event) {
    let el = event.target;
    this._justFinishedDraggingOrDropping = false;
    if (el === this || el === this.$.canvas) {
      return;
    }

    if (this._resizing) {
      this.resizeElement(event, el);
    } else {
      let rekt = el.getBoundingClientRect();
      this.dragElement(event, el, rekt);
    }

    // TODO: I don't know how to do this better, but I should fix this one day.
    // The problem is that sometimes when you drag, the end drag is outside
    // the dragging target (like, if it resizes because CSS), and will
    // register as a click on the canvas and it's annoying. This gets
    // around that but in a gross way.
    if (event.detail.state === 'end') {
      this._justFinishedDraggingOrDropping = true;
    }
  }

  dragElement(event, el, rekt) {
    switch (event.detail.state) {
      case 'start':
        this._resizing = false;
        el.style.position = 'absolute';
        el.classList.add('dragging');
        el.classList.add('active');
        break;
      case 'track':
        let trackX = event.detail.dx;
        let trackY = event.detail.dy;
        if (this._alignOnGrid) {
          trackX = Math.round(trackX / this._gridSize) * this._gridSize;
          trackY = Math.round(trackY / this._gridSize) * this._gridSize;
        }
        el.style.transform = el.style.webkitTransform =
          'translate(' + trackX + 'px, ' + trackY + 'px)';

        // See if it's over anything.
        this._dropTarget = null;
        let targets = this.$.canvas.querySelectorAll('*');
        for (let i = 0; i < targets.length; i++) {
          let t = targets[i];
          t.classList.remove('over');

          // Only some native elements and things with slots can be
          // drop targets.
          let slots = t ? t.querySelectorAll('slot') : [];

          // input is the only native in this app that doesn't have a slot
          let canDrop =
            (t.localName.indexOf('-') === -1 && t.localName !== 'input') ||
            t.localName === 'dom-repeat' || slots.length !== 0;

          if (!canDrop) {
            continue;
          }

          // Do we actually intersect this child?
          let b = t.getBoundingClientRect();
          if (rekt.left > b.left && rekt.left < b.left + b.width &&
            rekt.top > b.top && rekt.top < b.top + b.height) {

            // New target! Remove the other target indicators.
            var previousTargets = this.root.querySelectorAll('.over');
            for (var j = 0; j < previousTargets.length; j++) {
              previousTargets[j].classList.remove('over');
            }
            t.classList.add('over');

            if (event.detail.sourceEvent.altKey)
              this._dropTarget = t;
          }
        }
        break;
      case 'end':
        this._resizing = false;
        let reparented = false;
        let oldParent = el.parentElement;
        let newParent;
        // Does this need to be added to a new parent?
        if (this._dropTarget) {
          reparented = true;
          oldParent.removeChild(el);

          // If there was a textContent nuke it, or else you'll
          // never be able to again.
          if (this._dropTarget.children.length === 0) {
            this._dropTarget.textContent = '';
          }
          this._dropTarget.appendChild(el);
          newParent = this._dropTarget;
          this._dropTarget = null;
        } else if (el.parentElement && (el.parentElement !== this.$.canvas)) {
          reparented = true;
          // If there's no drop target and the el used to be in a different
          // parent, move it to the main view.
          newParent = this.$.canvas;
          el.parentElement.removeChild(el);
          this.add(el);
        }
        let parent = el.parentElement.getBoundingClientRect();

        let oldLeft = el.style.left;
        let oldTop = el.style.top;
        let oldPosition = el.style.position;
        if (reparented) {
          el.style.position = 'relative';
          el.style.left = el.style.top = '0px';
          this.actionHistory.add('reparent', el,
            {
              new: {
                parent: newParent,
                left: el.style.left, top: el.style.top, position: el.style.position
              },
              old: {
                parent: oldParent,
                left: oldLeft, top: oldTop, position: oldPosition
              }
            });
        } else {
          el.style.position = 'absolute';
          el.style.left = rekt.left - parent.left + 'px';
          el.style.top = rekt.top - parent.top + 'px';
          this.actionHistory.add('move', el,
            {
              new: { left: el.style.left, top: el.style.top, position: el.style.position },
              old: { left: oldLeft, top: oldTop, position: oldPosition }
            });
        }

        if (newParent)
          newParent.classList.remove('over');
        if (oldParent)
          oldParent.classList.remove('over');
        el.classList.remove('dragging');
        el.classList.remove('resizing');
        el.style.transform = el.style.webkitTransform = 'none';
        break;
    }
    this.updateActiveElement(el);
    this.dispatchEvent(new CustomEvent('refresh-view', { bubbles: true, composed: true, detail: { whileTracking: true, node: this } }));
  }

  resizeElement(event, el) {
    switch (event.detail.state) {
      case 'track':
        let trackX = event.detail.dx;
        let trackY = event.detail.dy;
        if (this._alignOnGrid) {
          trackX = Math.round(trackX / this._gridSize) * this._gridSize;
          trackY = Math.round(trackY / this._gridSize) * this._gridSize;
        }
        el.style.width = this._initialWidth + trackX + 'px';
        el.style.height = this._initialHeight + trackY + 'px';
        break;
      case 'end':
        this._resizing = false;
        this.actionHistory.add('resize', el,
          {
            new: { width: el.style.width, height: el.style.height },
            old: { width: this._initialWidth + 'px', height: this._initialHeight + 'px' }
          });
        el.classList.remove('resizing');
        el.classList.remove('dragging');

        // Ensure that this element is still selected after we're done.
        // i.e.: Sometimes the end of a resize can end up outside of the element,
        // and register as a click on the main canvas, deselecting the thing
        // you were dragging.
        setTimeout(function () {
          el.click();
        }, 50)
        break;
    }
    this.updateActiveElement(el);
  }

  dragShouldSize(event, rect) {
    const right = rect.right - event.detail.x;
    const bottom = rect.bottom - event.detail.y;
    return (right < 8 && bottom < 8);
  }

  deepTargetFind(x, y, notThis) {
    let node = document.elementFromPoint(x, y);
    let next = node;
    // this code path is only taken when native ShadowDOM is used
    // if there is a shadowroot, it may have a node at x/y
    // if there is not a shadowroot, exit the loop
    while (next !== notThis && next && next.shadowRoot) {
      // if there is a node at x/y in the shadowroot, look deeper
      let oldNext = next;
      next = next.shadowRoot.elementFromPoint(x, y);
      // on Safari, elementFromPoint may return the shadowRoot host
      if (oldNext === next) {
        break;
      }
      if (next) {
        node = next;
      }
    }
    return node;
  }

  onKeyDown(event) {
    let el = this.selectedElement;
    if (!el) {
      return;
    }

    // This is a global window handler, so clicks can come from anywhere
    // We only care about keys that come after you've clicked on an element,
    // or keys after you've selected something from the tree view.
    // TODO: can this be less bad since it's p horrid?
    let isOk =
      (event.composedPath()[0].localName === 'button' &&
        event.composedPath()[2].localName == 'tree-view') ||
      (event.composedPath()[0].localName == 'body') ||
      event.composedPath()[0].classList.contains('active');

    if (!isOk) {
      return;
    }
    let oldLeft = parseInt(el.style.left);
    let oldTop = parseInt(el.style.top);
    let oldPosition = el.style.position;

    switch (event.keyCode) {
      case 38:  // up arrow
        if (event.shiftKey) {
          event.preventDefault();
          this.dispatchEvent(new CustomEvent('move', { bubbles: true, composed: true, detail: { type: 'up', node: this } }));
        } else {
          el.style.top = oldTop - 10 + 'px';
        }
        break;
      case 40:  // down arrow
        if (event.shiftKey) {
          event.preventDefault();
          this.dispatchEvent(new CustomEvent('move', { bubbles: true, composed: true, detail: { type: 'down', node: this } }));
        } else {
          el.style.top = oldTop + 10 + 'px';
        }
        break;
      case 37:  // left arrow
        if (event.shiftKey) {
          event.preventDefault();
          this.dispatchEvent(new CustomEvent('move', { bubbles: true, composed: true, detail: { type: 'back', node: this } }));
        } else {
          el.style.left = oldLeft - 10 + 'px';
        }
        break;
      case 39:  // right arrow
        if (event.shiftKey) {
          event.preventDefault();
          this.dispatchEvent(new CustomEvent('move', { bubbles: true, composed: true, detail: { type: 'forward', node: this } }));
        } else {
          el.style.left = oldLeft + 10 + 'px';
        }
        break;
    }
    this.actionHistory.add('move', el,
      {
        new: { left: el.style.left, top: el.style.top, position: el.style.position },
        old: { left: oldLeft, top: oldTop, position: oldPosition }
      });
  }
}
