<h1 id="Beta_release">what's new in beta version</h1>

- <a href="#Beta_bookmark">BOOKMARK</a> component changes
- <a href="#Beta_quick_run">QUICK RUN</a> component changes
- <a href="#Beta_refer_link">REFER LINK</a> component changes
- <a href="#Beta_development">DEVELOPMENT</a> changes

<h1 id="Beta_bookmark">bookmark</h1>

- fixed a bug when use command `quickSelectActiveGroup`
- add new command `bookmark_x.quickSelectBookmark` to select bookmark to jump in command palette. [issue#8](https://github.com/tommyme/vscode-bookmark-x/issues/8)

<h1 id="Beta_quick_run">quick run</h1>

- better tasks json template(predefined some input variables)
- robust openTasksJson command, now it can be called by clicking the btn and command palette

<h1 id="Beta_refer_link">refer link</h1>

- add new command `bmx.referLink.swapSelection` to swap two selections
- add new command `bmx.referLink.createSnippet` to create snippet with selected code for current language

<h1 id="Beta_development">development</h1>

- json contributes files are changed to jsonc file(json with comment).
- add a task in workspace tasks.json to run watch command easier.
- add public utils for all components.
- add new changelog html to better display changes.
