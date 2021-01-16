<template>
    <table class="shell--completion-list">
        <tr v-for="(row, $idx) in rows" :key="$idx">
            <td v-for="(cell, $idx) in row" :key="$idx">
                {{cell.text}}
            </td>
        </tr>
    </table>
</template>

<style scoped>
td {
    padding-right: 3em;
    white-space: nowrap;
    line-height: 1.1;
}
</style>

<script>
export default {
    props: ['items'],
    computed: {
        rows() {
            return (this.items || []).map(c => [c]);
        }
    }
}
</script>
