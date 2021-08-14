<template>
    <span class="shell--prompt">
        <span class="shell--prompt--cwd">{{cwd}}</span><span class="shell--prompt--sep"> # </span>
    </span>
</template>

<script>
export default {
    props: ['cwd']
}
</script>
