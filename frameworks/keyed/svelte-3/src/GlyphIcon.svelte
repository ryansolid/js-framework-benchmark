<svelte:options immutable={true} />
<script>
  export let preload = false;
</script>
<span class="{preload ? 'preloadicon glyphicon glyphicon-remove' : 'glyphicon glyphicon-remove'}"
  aria-hidden="true"></span>