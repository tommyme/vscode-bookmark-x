<h1 id="Beta_release">what's new in beta version</h1>

- <a href="#Beta_bookmark">BOOKMARK</a> component changes
- <a href="#Beta_quick_run">QUICK RUN</a> component changes
- <a href="#Beta_refer_link">REFER LINK</a> component changes
- <a href="#Beta_development">DEVELOPMENT</a> changes

<h1 id="Beta_bookmark">bookmark</h1>

- ✨ now, manual sort is the default sort method and you can drag and drop nodes to sort them (drag nodeA to nodeB means place A after B)
  - use button on bmx container status bar to toggle sorting.
- 🐛 add new command to detect all outdated bookmark
  - now when you click on a bookmark, bmx will check if the line content is the same as that in bookmark
    - if diff, the bookmark will be marked as `tobefixed`, and you can fix it by right click on gutter of the lineNumber area of editor.
- 🐛 fix toggle bookmark problem in linux workspace.
- 🔥 add new bulk edit command to edit node name quickly(Performance is not optimized)
  - that command opens a tmp file and show name of bookmarks in it, you can edit node names here.
    - when you've done, use command `Bookmark X: bulk apply node name` to apply the file

<h1 id="Beta_quick_run">quick run</h1>

<h1 id="Beta_refer_link">refer link</h1>

- add new commands to copy files content for aigc with filename.
  - select files in explorer view, right click on any of them, click aigc item, content copied.
  - you can use `aigc` in command palette to perform copy with previous files.
- add new command to set vscode editor background with random dark color.

<h1 id="Beta_development">development</h1>
