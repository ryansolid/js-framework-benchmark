<svelte:options immutable={true} />
<script>
  export let id;
  export let title;
  export let cb;
</script>

<div class="col-sm-6 smallpad">
  <button type="button" class="btn btn-primary btn-block" id={id} on:click={cb}>{title}</button>
</div>