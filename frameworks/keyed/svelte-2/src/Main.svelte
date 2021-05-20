<div class="jumbotron">
  <div class="row">
    <div class="col-md-6">
      <h1>Svelte (keyed)</h1>
    </div>
    <div class="col-md-6">
      <div class="row">
        <Button id="run" title="Create 1,000 rows" cb={run} />
        <Button id="runlots" title="Create 10,000 rows" cb={runLots} />
        <Button id="add" title="Append 1,000 rows" cb={add} />
        <Button id="update" title="Update every 10th row" cb={partialUpdate} />
        <Button id="clear" title="Clear" cb={clear} />
        <Button id="swaprows" title="Swap rows" cb={swapRows} />
      </div>
    </div>
  </div>
</div>
<table class="table table-hover table-striped test-data">
  <tbody>
    {#each data as row, num (row.id)}
      <Row id={row.id} label={row.label} selected={row.id === selected} {select} {remove} />
    {/each}
  </tbody>
</table>
<span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>

<script>
  import Button from './Button.svelte';
  import Row from './Row.svelte';
  let rowId = 1,
    data = [],
    selected = undefined;

  const add = () => data = data.concat(buildData(1000)),
    clear = () => {
      data = [];
      selected = undefined;
    },
    partialUpdate = () => {
      for (let i = 0; i < data.length; i += 10) {
        data[i].label += ' !!!';
      }
    },
    remove = (num) => {
      const idx = data.findIndex(d => d.id === num);
      data = [...data.slice(0, idx), ...data.slice(idx + 1)];
    },
    run = () => {
      data = buildData(1000);
      selected = undefined;
    },
    runLots = () => {
      data = buildData(10000);
      selected = undefined;
    },
    select = (id) => selected = id,
    swapRows = () => {
      if (data.length > 998) {
        data = [data[0], data[998], ...data.slice(2, 998), data[1], data[999]];
      }
    };

  let seed = 0;
  // random function is replaced to remove any randomness from the benchmark.
  const random = (max) => seed++ % max;
  function buildData(count = 1000) {
    const adjectives = ["pretty", "large", "big", "small", "tall", "short", "long", "handsome", "plain", "quaint", "clean", "elegant", "easy", "angry", "crazy", "helpful", "mushy", "odd", "unsightly", "adorable", "important", "inexpensive", "cheap", "expensive", "fancy"],
      colours = ["red", "yellow", "blue", "green", "pink", "brown", "purple", "brown", "white", "black", "orange"],
      nouns = ["table", "chair", "house", "bbq", "desk", "car", "pony", "cookie", "sandwich", "burger", "pizza", "mouse", "keyboard"],
      data = new Array(count);
    for (var i = 0; i < count; i++)
      data[i] = { id: rowId++, label: adjectives[random(adjectives.length)] + " " + colours[random(colours.length)] + " " + nouns[random(nouns.length)] };
    return data;
  }
</script>
