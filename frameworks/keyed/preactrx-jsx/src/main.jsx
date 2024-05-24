import { signal } from "@preact/signals-core";
import { render, map, createSelector } from 'preactrx-jsx';

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
      label: signal(`${adjectives[_random(adjectives.length)]} ${colours[_random(colours.length)]} ${nouns[_random(nouns.length)]}`)
    }
  }
  return data;
}

const Button = ({ id, text, fn }) =>
  <div class='col-sm-6 smallpad'>
    <button id={ id } class='btn btn-primary btn-block' type='button' onClick={ fn }>{ text }</button>
  </div>

const App = () => {
  const data = signal([]),
    selected = signal(null),
    run = () => (data.value = buildData(1000)),
    runLots = () => (data.value = buildData(10000)),
    add = () => (data.value = [...data.value, ...buildData(1000)]),
    update = () => {
      for (let i = 0, d = data.value, len = d.length; i < len; i += 10)
        d[i].label.value += " !!!";
    },
    swapRows = () => {
      const d = data.value.slice();
      if (d.length > 998) {
        let tmp = d[1];
        d[1] = d[998];
        d[998] = tmp;
        data.value = d;
      }
    },
    clear = () => (data.value = []),
    select = id => selected.value = id,
    remove = id => {
      const d = data.value;
      const idx = d.findIndex((d) => d.id === id);
      data.value = [...d.slice(0, idx), ...d.slice(idx + 1)];
    },
    isSelected = createSelector(() => selected.value);

  const list = map(() => data.value, row => {
    const rowId = row.id;
    return <tr class={isSelected(rowId) ? "danger" : ""}>
      <td class='col-md-1' textContent={ rowId } />
      <td class='col-md-4'><a onClick={[select, rowId]} textContent={ row.label.value } /></td>
      <td class='col-md-1'><a onClick={[remove, rowId]}><span class='glyphicon glyphicon-remove' aria-hidden="true" /></a></td>
      <td class='col-md-6'/>
    </tr>
  })

  return <div class='container'>
    <div class='jumbotron'><div class='row'>
      <div class='col-md-6'><h1>PreactRX JSX Keyed</h1></div>
      <div class='col-md-6'><div class='row'>
        <Button id='run' text='Create 1,000 rows' fn={ run } />
        <Button id='runlots' text='Create 10,000 rows' fn={ runLots } />
        <Button id='add' text='Append 1,000 rows' fn={ add } />
        <Button id='update' text='Update every 10th row' fn={ update } />
        <Button id='clear' text='Clear' fn={ clear } />
        <Button id='swaprows' text='Swap Rows' fn={ swapRows } />
      </div></div>
    </div></div>
    <table class='table table-hover table-striped test-data'><tbody>
      {list}
    </tbody></table>
    <span class='preloadicon glyphicon glyphicon-remove' aria-hidden="true" />
  </div>;
}

render(App, document.getElementById("main"));
