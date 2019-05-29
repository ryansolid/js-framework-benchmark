import { createRoot, createState, selectWhen } from 'solid-js';
import h from 'solid-js/h';

let idCounter = 1;
const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"],
  colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"],
  nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

function _random (max) { return Math.round(Math.random() * 1000) % max; };

function buildData(count) {
  let data = new Array(count);
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: idCounter++,
      label: `${adjectives[_random(adjectives.length)]} ${colours[_random(colours.length)]} ${nouns[_random(nouns.length)]}`
    }
  }
  return data;
}

const Button = ({ id, text, fn }) =>
  h('.col-sm-6.smallpad',
    h(`button#${id}.btn.btn-primary.btn-block`, {
      type: 'button', onClick: fn
    }, text)
  )

const App = () => {
  const [ state, setState ] = createState({ data: [], selected: null }),
    run = () => setState({ data: buildData(1000), selected: null }),
    runLots = () => setState({ data: buildData(10000), selected: null }),
    add = () => setState('data', d => [...d, ...buildData(1000)]),
    update = () => setState('data', { by: 10 }, 'label', l => l + ' !!!'),
    swapRows = () => setState('data', d => d.length > 998 ? { 1: d[998], 998: d[1] } : d),
    clear = () => setState({ data: [], selected: null }),
    select = (e, id) => setState('selected', id),
    remove = (e, id) => setState('data', d => {
      const idx = d.findIndex(d => d.id === id);
      return [...d.slice(0, idx), ...d.slice(idx + 1)];
    });

  return h([
    h('.container', [
      h('.jumbotron', h('.row', [
        h('.col-md-6', h('h1', 'SolidJS Keyed')),
        h('.col-md-6', h('.row', [
          Button({ id: 'run', text: 'Create 1,000 rows', fn: run }),
          Button({ id: 'runlots', text: 'Create 10,000 rows', fn: runLots }),
          Button({ id: 'add', text: 'Append 1,000 rows', fn: add }),
          Button({ id: 'update', text: 'Update every 10th row', fn: update }),
          Button({ id: 'clear', text: 'Clear', fn: clear }),
          Button({ id: 'swaprows', text: 'Swap Rows', fn: swapRows })
        ]))
      ])),
      h('table.table.table-hover.table-striped.test-data', h('tbody',
        h.each(() => state.data, row =>
          h('tr', {model: row.id}, [
            h('td.col-md-1', row.id),
            h('td.col-md-4', h('a', {onClick: select}, () => row.label)),
            h('td.col-md-1', h('a', {onClick: remove}, h('span.glyphicon.glyphicon-remove'))),
            h('td.col-md-6')
          ])
        , { afterRender: selectWhen(() => state.selected, 'danger') })
      )),
      h('span.preloadicon.glyphicon.glyphicon-remove', {attrs: {'aria-hidden': true}})
    ])
  ]);
}

createRoot(() => document.getElementById("main").appendChild(App()))
