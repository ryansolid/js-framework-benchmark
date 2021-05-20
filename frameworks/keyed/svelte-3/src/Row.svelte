<script>
  import Cell from "./Cell.svelte";
  import GlyphIcon from "./GlyphIcon.svelte";

  export let id;
  export let label;
  export let selected;
  export let select;
  export let remove;
</script>

<tr class={selected ? "danger" : ""}>
  <Cell className="col-md-1">{id}</Cell>
  <Cell className="col-md-4"><a on:click={() => select(id)}>{label}</a></Cell>
  <Cell className="col-md-1"><a on:click={() => remove(id)}><GlyphIcon preload={false} /></a></Cell>
  <Cell className="col-md-6" />
</tr>
