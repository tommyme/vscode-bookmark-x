<h1 id="Beta_release">what's new in beta version</h1>

- <a href="#Beta_bookmark">BOOKMARK</a> component changes
- <a href="#Beta_quick_run">QUICK RUN</a> component changes
- <a href="#Beta_refer_link">REFER LINK</a> component changes
- <a href="#Beta_development">DEVELOPMENT</a> changes

<h1 id="Beta_bookmark">bookmark</h1>

- fixed a bug when use command `quickSelectActiveGroup`
- add new command `bookmark_x.quickSelectBookmark` to select bookmark to jump in command palette. [issue#8](https://github.com/tommyme/vscode-bookmark-x/issues/8)
- add sort method for manual sorting, you can use arrow button and filter button to sort bookmark in your favourite order, thanks to [Latria-Kure](https://github.com/Latria-Kure) in [PR#11](https://github.com/tommyme/vscode-bookmark-x/pull/11) and [PR#14](https://github.com/tommyme/vscode-bookmark-x/pull/14)
    - what you need to do is to set `bookmarkX.sort` to `manual` in vscode settings.
    - fix a bug when use it in multi-project [issue#13](https://github.com/tommyme/vscode-bookmark-x/issues/13)
    - configurable icon color for active group and sorting item in [PR#15](https://github.com/tommyme/vscode-bookmark-x/pull/15), you can configure it with `"workbench.colorCustomizations"` field in `settings.json`
- fixed a bug when using groupBookmark [issue#17](https://github.com/tommyme/vscode-bookmark-x/issues/17)

<h1 id="Beta_quick_run">quick run</h1>

- better tasks json template(predefined some input variables)
- robust openTasksJson command, now it can be called by clicking the btn and command palette

<h1 id="Beta_refer_link">refer link</h1>

- add new command `bmx.referLink.swapSelection` to swap two selections
- add new command `bmx.referLink.createSnippet` to create snippet with selected code for current language
    - better vscode snippet creation(you can specify snipname, short desc, long desc in it.)
- add new command `bmx.referLink.diffTwo` to diff two editor tab quickly

<h1 id="Beta_development">development</h1>

- json contributes files are changed to jsonc file(json with comment).
- add a task in workspace tasks.json to run watch command easier.
- add public utils for all components.
- add new changelog html to better display changes.
- upgrade eslint to v9.9.0 and use `eslint.config.mjs` to detect problems in code.
- now Controller is no longer a object, now it's a class for convenient.