'use strict';

let seed = 0;
// random function is replaced to remove any randomness from the benchmark.
const random = (max) => seed++ % max;

const A = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"];
const C = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"];
const N = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"];

let data = [];
let selected = 0;

let nextId = 1;
function buildData(count) {
  const data = Array(count);
  for (let i = 0; i < count; i++) {
    data[i] = { id: nextId++, label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}` };
  }
  return data;
}

function update() {
  for (let i = 0; i < data.length; i += 10) {
    data[i].label += " !!!";
  }
}

function run() {
  data = buildData(1000);
  selected = 0;
}

function runLots() {
  data = buildData(10000);
  selected = 0;
}

function add() {
  data = data.concat(buildData(1000));
  selected = 0;
}

function clear() {
  data = [];
  selected = 0;
}

function swapRows() {
  if (data.length > 998) {
    const tmp = data[1];
    data[1] = data[998];
    data[998] = tmp;
  }
}

function remove(id) {
  const idx = data.findIndex(d => d.id === id);
  data.splice(idx, 1);
  return idx;
}

function select(id) {
  selected = id;
}

const tbody = document.getElementById("tbody");
const rowTemplate = document.createElement("tr");
rowTemplate.innerHTML = "<td class='col-md-1'></td><td class='col-md-4'><a></a></td><td class='col-md-1'><a><span class='glyphicon glyphicon-remove' aria-hidden='true'></span></a></td><td class='col-md-6'></td>";

function createRow(rowData) {
  const tr = rowTemplate.cloneNode(true);
  const td1 = tr.firstChild;
  const a2 = td1.nextSibling.firstChild;
  td1.textContent = rowData.id;
  a2.textContent = rowData.label;
  return tr;
}

let prevSelectedId = 0;
let prevSelected = null;
function updateSelect() {
  if (prevSelectedId !== selected) {
    prevSelectedId = selected;
    if (prevSelected) {
      prevSelected.className = "";
    }
    if (selected !== 0) {
      const idx = data.findIndex((item) => item.id === selected);
      if (idx !== -1) {
        prevSelected = tbody.childNodes[idx];
        prevSelected.className = "danger";
      } else {
        prevSelected = null;
      }
    }
  }
}

let rowsCount = 0;
function removeAllRows() {
  rowsCount = 0;
  tbody.textContent = "";
}

function appendRows() {
  for (let i = rowsCount; i < data.length; i++) {
    tbody.appendChild(createRow(data[i]));
  }
  rowsCount = data.length;
}

document.getElementById("main").addEventListener("click", ({ target }) => {
  if (target.matches("#add")) {
    add();
    appendRows();
  } else if (target.matches("#run")) {
    run();
    removeAllRows();
    appendRows();
  } else if (target.matches("#runlots")) {
    runLots();
    removeAllRows();
    appendRows();
  } else if (target.matches("#update")) {
    update();
    const rows = tbody.childNodes;
    for (let i = 0; i < data.length; i += 10) {
      rows[i].childNodes[1].childNodes[0].textContent = data[i].label;
    }
  } else if (target.matches("#clear")) {
    clear();
    removeAllRows();
  } else if (target.matches("#swaprows")) {
    swapRows();
    const childNodes = tbody.childNodes;
    const a = childNodes[1];
    const b = childNodes[998];
    const aNext = a.nextSibling;
    const bNext = b.nextSibling;
    tbody.insertBefore(a, bNext);
    tbody.insertBefore(b, aNext);
  }
});

tbody.addEventListener("click", ({ target }) => {
  const id = Number.parseInt(target.closest("tr").firstChild.firstChild.nodeValue);
  if (target.matches(".glyphicon-remove")) {
    const idx = remove(id);
    tbody.childNodes[idx].remove();
  } else if (target.matches("a")) {
    select(id);
    updateSelect();
  }
});
