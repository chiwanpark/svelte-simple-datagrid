---
'@chiwanpark/svelte-simple-datagrid': patch
---

Fix double-click auto-fit making columns far too wide, since the leftover grid width was added to the measured column, and fix double-click auto-fit and arrow key resizing doing nothing when no `oncolumnresize` handler is passed.
