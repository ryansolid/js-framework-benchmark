import { _, render, Events, onClick, withNextFrame, elementProto, statelessComponent, component, TrackByKey, key, useMutationEffect, getDOMNode } from "ivi";
import { h1, div, span, table, tbody, tr, td, a, button } from "ivi-html";

let seed = 0;
// random function is replaced to remove any randomness from the benchmark.
const random = (max) => seed++ % max;
const A = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const C = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const N = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

let nextId = 1;
function buildData(count) {
  const data = Array(count);
  for (let i = 0; i < count; i++) {
    data[i] = { id: nextId++, label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}` };
  }
  return data;
}

const INITIAL_STATE = { data: [], selected: 0 };
let state = INITIAL_STATE;
const m = (fn) => (...args) => {
  state = fn.apply(_, [state, ...args]);
  tick();
};

const run = m(({ selected }) => ({ data: buildData(1000), selected }));
const runlots = m(({ selected }) => ({ data: buildData(10000), selected }));
const add = m(({ data, selected }) => ({ data: data.concat(buildData(1000)), selected }));
const update = m(({ data, selected }) => {
  data = data.slice();
  for (let i = 0; i < data.length; i += 10) {
    const r = data[i];
    data[i] = { id: r.id, label: r.label + " !!!" };
  }
  return { data, selected };
});
const swaprows = m(({ data, selected }) => {
  data = data.slice();
  const tmp = data[1];
  data[1] = data[998];
  data[998] = tmp;
  return { data, selected };
});
const select = m(({ data }, id) => ({ data, selected: id }));
const remove = m(({ data, selected }, id) => (data = data.slice(), data.splice(data.findIndex((item) => item.id === id), 1), { data, selected }));
const clear = m(() => INITIAL_STATE);

const removeIcon = elementProto(span("glyphicon glyphicon-remove", { "aria-hidden": "true" }));
const cmd1 = td("col-md-1", _, a(_, _, removeIcon()));
const cmd6 = td("col-md-6");
const Row = statelessComponent((data) => tr(_, _, [td("col-md-1", _, data.id), td("col-md-4", _, a(_, _, data.label)), cmd1, cmd6]));

const click = onClick(({ target }) => {
  const id = Number.parseInt(target.closest("tr").firstChild.firstChild.nodeValue);
  if (target.matches(".glyphicon-remove")) {
    remove(id);
  } else {
    select(id);
  }
});

const RowList = statelessComponent((rows) => Events(click, TrackByKey(rows.map((item) => key(item.id, Row(item))))));
const Rows = component((c) => {
  const select = useMutationEffect(c, (selected) => {
    if (selected !== 0) {
      const idx = state.data.findIndex((item) => item.id === selected);
      if (idx !== -1) {
        const tr = getDOMNode(c).childNodes[idx];
        tr.className = "danger";
        return () => { tr.className = ""; };
      }
    }
  });
  return ({ data, selected }) => (select(selected), tbody(_, _, RowList(data)));
});

const Button = (text, id, cb) => div("col-sm-6 smallpad", _, Events(onClick(cb), button("btn btn-primary btn-block", { type: "button", id }, text)));
const Jumbotron = div("jumbotron", _, div("row", _, [
  div("col-md-6", _, h1(_, _, "ivi")),
  div("col-md-6", _, div("row", _, [
    Button("Create 1,000 rows", "run", run),
    Button("Create 10,000 rows", "runlots", runlots),
    Button("Append 1,000 rows", "add", add),
    Button("Update every 10th row", "update", update),
    Button("Clear", "clear", clear),
    Button("Swap Rows", "swaprows", swaprows),
  ])),
]));

function tick() {
  withNextFrame(() => {
    render(
      div("container", _, [
        Jumbotron,
        table("table table-hover table-striped test-data", _, Rows(state)),
        removeIcon("preloadicon glyphicon glyphicon-remove"),
      ]),
      document.getElementById("main"),
    );
  })();
}
tick();