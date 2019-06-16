import { html, render } from '../node_modules/lit-html/lit-html.js';
import { repeat } from '../node_modules/lit-html/directives/repeat.js';

const adjectives = [
  'pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy',
  'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap',
  'expensive', 'fancy'];
const colours = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza',
  'mouse', 'keyboard'];

let seed = 0;
// random function is replaced to remove any randomness from the benchmark.
const random = (max) => seed++ % max;
const buildData = count => {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: did++,
      label: `${adjectives[random(adjectives.length)]} ${colours[random(colours.length)]} ${nouns[random(nouns.length)]}`,
      selected: false,
    });
  }
  return data;
};

let data = [];
let did = 1;
let selected = 0;

const add = () => {
  data = data.concat(buildData(1000));
  _render();
};
const run = () => {
  data = buildData(1000);
  selected = 0;
  _render();
};
const runLots = () => {
  data = buildData(10000);
  selected = 0;
  _render();
};
const clear = () => {
  data = [];
  selected = 0;
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
  data.splice(data.findIndex(d => d.id === id), 1);
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
    data[i].label += ' !!!';
  }
  _render();
};

const container = document.getElementById('container');
const _render = () => {
  render(template(), container);
};

const Button = (id, cb, title) => html`<div class="col-sm-6 smallpad"><button type="button" class="btn btn-primary btn-block" id=${id} @click=${cb}>${title}</button></div>`;
const RemoveIcon = (preload) => html`<span class=${preload ? "preloadicon glyphicon glyphicon-remove" : "glyphicon glyphicon-remove"} aria-hidden="true"></span>`;
const Row = ({ id, label }) => html`
<tr id=${id} class=${selected === id ? 'danger' : ''}>
  <td class="col-md-1">${id}</td>
  <td class="col-md-4"><a>${label}</a></td>
  <td class="col-md-1" data-interaction='delete'><a>${RemoveIcon()}</a></td>
  <td class="col-md-6"></td>
</tr>
`;

const template = () => html`
<div class="container">
  <div class="jumbotron">
    <div class="row">
      <div class="col-md-6">
        <h1>Lit-HTML</h1>
      </div>
      <div class="col-md-6">
        <div class="row">
          ${Button("run", run, "Create 1,000 rows")}
          ${Button("runlots", runLots, "Create 10,000 rows")}
          ${Button("add", add, "Append 1,000 rows")}
          ${Button("update", update, "Update every 10th row")}
          ${Button("clear", clear, "Clear")}
          ${Button("swaprows", swapRows, "Swap Rows")}
        </div>
      </div>
    </div>
  </div>
  <table @click=${interact} class="table table-hover table-striped test-data">
    <tbody>${repeat(data, item => item.id, item => Row(item))}</tbody>
  </table>
  ${RemoveIcon(true)}
</div>`;

_render();
