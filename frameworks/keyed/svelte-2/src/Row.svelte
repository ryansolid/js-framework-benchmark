<script>
  export let id;
  export let label;
  export let selected;
  export let select;
  export let remove;
</script>

<tr class={selected ? "danger" : ""}>
  <td class="col-md-1">{id}</td>
  <td class="col-md-4"><a on:click={() => select(id)}>{label}</a></td>
  <td class="col-md-1"><a on:click={() => remove(id)}><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td>
  <td class="col-md-6" />
</tr>
