import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { customElement } from '@polymer/decorators';

@customElement('help-view')
export class HelpView extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
          height: 100%;
          width: 100%;
          overflow-x: hidden;
          text-align: justify;
          box-sizing: border-box;
          padding: 20px;
          background: var(--canvas-background);
        }
        h2 {
          font-size: 24px;
          font-weight: 400;
          line-height: 40px;
          color: var(--highlight-pink);
        }
        h2:first-of-type {
          margin-top: 0;
        }
        p {
          font-size: 15px;
          font-weight: 400;
          line-height: 20px;
          color: var(--help-color);
        }
      </style>
      <h2>About</h2>
      <p>This is a very simple UI prototyping tool for HTML, web components, and Polymer.
        View on <a href="https://github.com/PolymerLabs/wizzywid" title="WIZZYWID - GitHub">GitHub</a>.
      </p>
      <h2>Getting Started</h2>
      <p>➕ To <b>add</b> an element to the canvas, click on one of the buttons in the
      Native/Custom/Samples palettes. Then, you can drag it and resize it in the canvas.
      </p>
      <p>🎨 To change an element's properties, select it by clicking on it, and then change any of
        the values in the Properties/Styles/Flex panels.
      </p>
      <p>👀 The <i>Code</i> panel will show you the code for your element, and the <i>Preview</i>
        panel will show you the running code, in an iframe. There is also an option to automatically
        export it to a JSFiddle.
      </p>
      <h2>Notes</h2>
      <p>The drag and drop feature is a little quirky, and sometimes infuriating. The biggest
        problems are when you reparent a child (and its position changes from <i>relative</i>
        to <i>absolute</i> or viceversa). If something goes horribly wrong, press the Undo button!
      </p>
      <p>When you're bored, add the <i>#tufte</i> hash to the URL for a good time </p>
    `;
  }
}
