# @chiwanpark/svelte-simple-datagrid

## 0.1.0

### Minor Changes

- [#13](https://github.com/chiwanpark/svelte-simple-datagrid/pull/13) [`3ed9549`](https://github.com/chiwanpark/svelte-simple-datagrid/commit/3ed95496a70376f421526888d297ffcf37bdf4e3) Thanks [@chiwanpark](https://github.com/chiwanpark)! - Add an `autoSize` prop and an `autoSizeColumns(columnIds?, { skipHeader, maxWidth })` method that size columns to fit their content, so wide grids scroll horizontally instead of squeezing every column.

- [#12](https://github.com/chiwanpark/svelte-simple-datagrid/pull/12) [`e0e091a`](https://github.com/chiwanpark/svelte-simple-datagrid/commit/e0e091a88fcc4130af45c3232a412a971b990797) Thanks [@chiwanpark](https://github.com/chiwanpark)! - Export the default bottom bar parts as `RowCount`, `SelectionCount` and `PageSizeSelect`, so a custom `bottomBarContent` can reuse them next to `Pagination` and its own controls.

- [#16](https://github.com/chiwanpark/svelte-simple-datagrid/pull/16) [`b00f608`](https://github.com/chiwanpark/svelte-simple-datagrid/commit/b00f60870efe5cedf8577fc97bb5585ef7291338) Thanks [@chiwanpark](https://github.com/chiwanpark)! - Add `--ssdg-header-font-weight` and `--ssdg-row-number-font-weight` CSS custom properties to control the font weight of the header row and the row number column.

- [#11](https://github.com/chiwanpark/svelte-simple-datagrid/pull/11) [`0ac15a8`](https://github.com/chiwanpark/svelte-simple-datagrid/commit/0ac15a88205934bd355f18f50c5e0878e0172183) Thanks [@chiwanpark](https://github.com/chiwanpark)! - Export `setPage` and `setPageSize` methods on `DataGrid` so pagination can be controlled programmatically through `bind:this`.

- [#9](https://github.com/chiwanpark/svelte-simple-datagrid/pull/9) [`5b13283`](https://github.com/chiwanpark/svelte-simple-datagrid/commit/5b13283938b2913465c4aa76976300d212c6b708) Thanks [@chiwanpark](https://github.com/chiwanpark)! - Add a `rowNumbers` option that shows an auto-generated row number column with whole-row selection, like AG Grid, and a `rowNumbers` export option for CSV and XLSX.

- [#14](https://github.com/chiwanpark/svelte-simple-datagrid/pull/14) [`f182bc3`](https://github.com/chiwanpark/svelte-simple-datagrid/commit/f182bc30839379f1136a0f2c31888249afe1f05d) Thanks [@chiwanpark](https://github.com/chiwanpark)! - Fix theme overrides losing to the built-in CSS custom properties by declaring the defaults inside `:where()`, and add a `style` prop to set the variables inline.

### Patch Changes

- [#13](https://github.com/chiwanpark/svelte-simple-datagrid/pull/13) [`3ed9549`](https://github.com/chiwanpark/svelte-simple-datagrid/commit/3ed95496a70376f421526888d297ffcf37bdf4e3) Thanks [@chiwanpark](https://github.com/chiwanpark)! - Fix double-click auto-fit making columns far too wide, since the leftover grid width was added to the measured column, and fix double-click auto-fit and arrow key resizing doing nothing when no `oncolumnresize` handler is passed.

- [#15](https://github.com/chiwanpark/svelte-simple-datagrid/pull/15) [`9c5324f`](https://github.com/chiwanpark/svelte-simple-datagrid/commit/9c5324f4ac5b79f1b3a691cedf98d468bfc61fdd) Thanks [@chiwanpark](https://github.com/chiwanpark)! - Right align the row number column instead of centering it.
