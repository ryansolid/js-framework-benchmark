import { html, render } from '../node_modules/lit-html/lit-html.js';
import { repeat } from '../node_modules/lit-html/directives/repeat.js';

const adjectives = [
  'pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const colours = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

let seed = 0;
// random function is replaced to remove any randomness from the benchmark.
const random = (max) => seed++ % max;
const buildData = count => {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: did++,
      label: `${adjectives[random(adjectives.length)]} ${colours[random(colours.length)]} ${nouns[random(nouns.length)]}`
    });
  }
  return data;
};

let data = [];
let did = 1;
let selected = null;

const add = () => {
  data = data.concat(buildData(1000));
  _render();
};
const run = () => {
  data = buildData(1000);
  selected = null;
  _render();
};
const runLots = () => {
  data = buildData(10000);
  selected = null;
  _render();
};
const clear = () => {
  data = [];
  selected = null;
  _render();
};
const interact = e => {
  const td = e.target.closest('td');
  const interaction = td.getAttribute('data-interaction');
  const id = parseInt(td.parentNode.id);
  if (interaction === 'delete') {
    del(id);
  } else {
    select(id);
  }
};
const del = id => {
  const idx = data.findIndex(d => d.id === id);
  data.splice(idx, 1);
  _render();
};
const select = id => {
  selected = id;
  _render();
};
const swapRows = () => {
  if (data.length > 998) {
    const tmp = data[1];
    data[1] = data[998];
    data[998] = tmp;
  }
  _render();
};
const update = () => {
  for (let i = 0; i < data.length; i += 10) {
    const item = data[i];
    data[i].label += ' !!!';
  }
  _render();
};

let _render;

const template = () => html`
<div class="container">
  <div class="jumbotron">
    <div class="row">
      <div class="col-md-6">
        <h1>Lit-HTML</h1>
      </div>
      <div class="col-md-6">
        <div class="row">
          <div is="menu-button" class="col-sm-6 smallpad" .cb=${run} .type=${"run"} .text=${"Create 1,000 rows"}></div>
          <div is="menu-button" class="col-sm-6 smallpad" .cb=${runLots} .type=${"runlots"} .text=${"Create 10,000 rows"}></div>
          <div is="menu-button" class="col-sm-6 smallpad" .cb=${add} .type=${"add"} .text=${"Append 1,000 rows"}></div>
          <div is="menu-button" class="col-sm-6 smallpad" .cb=${update} .type=${"update"} .text=${"Update every 10th row"}></div>
          <div is="menu-button" class="col-sm-6 smallpad" .cb=${clear} .type=${"clear"} .text=${"Clear"}></div>
          <div is="menu-button" class="col-sm-6 smallpad" .cb=${swapRows} .type=${"swaprows"} .text=${"Swap Rows"}></div>
        </div>
      </div>
    </div>
  </div>
  <table @click=${interact} class="table table-hover table-striped test-data">
    <tbody>${repeat(data,
  item => item.id,
  item => html`
      <tr is="benchmark-row" id=${item.id} .label=${item.label} class=${item.id === selected ? 'danger' : ''}></tr>`
    )}
    </tbody>
  </table>
  <span is="remove-icon" .preload=${true}></span>
</div>`;

class BenchmarkApp extends HTMLDivElement {
  constructor() {
    super();
    _render = () => render(template(), this);
    _render();
  }
}

class Button extends HTMLDivElement {
  connectedCallback() {
    const button = html`<button type="button" class="btn btn-primary btn-block" id=${this.type} @click=${this.cb}>${this.text}</button>`;
    render(button, this);
  }
}

class Row extends HTMLTableRowElement {
  connectedCallback() {
    this.renderCells = () => render(html`<td is="benchmark-cell" class="col-md-1">${this.id}</td>
    <td is="benchmark-cell" class="col-md-4"><a>${this._label}</a></td>
    <td is="benchmark-cell" class="col-md-1" data-interaction='delete'><a><span is="remove-icon" .preload=${false}></span></a></td>
    <td is="benchmark-cell" class="col-md-6"></td>`, this);
    this.renderCells();
  }
  set label(v) { this._label = v; this.renderCells && this.renderCells(); }
}

class Cell extends HTMLTableCellElement {

}

class Icon extends HTMLSpanElement {
  connectedCallback() {
    this.className = this.preload ? "preloadicon glyphicon glyphicon-remove" : "glyphicon glyphicon-remove";
    this.setAttribute("aria-hidden", "true");
  }
}

customElements.define("menu-button", Button, { extends: "div" });
customElements.define("benchmark-row", Row, { extends: "tr" });
customElements.define("remove-icon", Icon, { extends: "span" });
customElements.define("benchmark-cell", Cell, { extends: "td" });
customElements.define("benchmark-app", BenchmarkApp, { extends: "div" });