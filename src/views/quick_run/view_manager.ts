import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import {
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  commands,
  tasks,
  workspace,
} from "vscode";
import {
  TREEVIEW_ITEM_CTX_TYPE_TASK,
  TREEVIEW_ITEM_CTX_TYPE_WSF,
  TREEVIEW_ITEM_ICON_TASK,
  TREEVIEW_ITEM_ICON_DEBUGCONF,
} from "./constants";
import * as commonUtil from "../utils/util";

export class TaskDataProvider implements TreeDataProvider<QuickRunTreeItem> {
  private changeEmitter = new EventEmitter<
    QuickRunTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  constructor(private context: vscode.ExtensionContext) {}
  public refresh() {
    this.changeEmitter.fire();
  }

  getTreeItem(element: QuickRunTreeItem): TreeItem {
    return element;
  }

  getChildren(element: QuickRunTreeItem): Thenable<QuickRunTreeItem[]> {
    if (!element) {
      return Promise.resolve(this.getAllWorkspaces());
    }
    return Promise.resolve(this.getAllContent(element));
  }

  public async getAllWorkspaces(): Promise<WsfTreeItem[]> {
    let res: Array<WsfTreeItem> = [];
    let wsfolders = vscode.workspace.workspaceFolders;
    if (wsfolders) {
      wsfolders.forEach((folder) => {
        let tvi = new WsfTreeItem(
          folder.name,
          TreeItemCollapsibleState.Expanded,
          folder,
        );
        tvi.contextValue = TREEVIEW_ITEM_CTX_TYPE_WSF;
        res.push(tvi);
      });
    }
    return res;
  }
  private async getAllContent(el: TreeItem): Promise<TaskTreeItem[]> {
    let wsf = vscode.workspace.workspaceFolders!.filter(
      (wsf) => wsf.name === el.label,
    )[0];
    let allTasks: TaskTreeItem[] = [];
    let allConfigs: TaskTreeItem[] = [];
    if ("want to get tasks") {
      allTasks = await this.getAllTasks(wsf);
    }
    if ("want to get launch") {
      // if (workspace.getConfiguration().get("QuickRunPanel.includeDebugConfigs")) {
      allConfigs = await this.getAllLaunchConfigs(wsf);
    }
    return allTasks.concat(allConfigs);
  }

  /**
   * Find all tasks, and filter on source
   */
  private async getAllTasks(
    wsf: vscode.WorkspaceFolder,
  ): Promise<TaskTreeItem[]> {
    let taskElements: TaskTreeItem[] = [];
    let allTasks = await tasks.fetchTasks();
    allTasks.forEach((task) => {
      let taskSources = ["Workspace"]; // 这里筛选一次，因为有时候有一些自动隐式生成的npm的task
      if (
        taskSources.some((value) => value === task.source) &&
        task.scope === wsf
      ) {
        // scope如果为2 则可能是workspace的全局task 或者User里面的task
        taskElements.push(
          new TaskTreeItem(
            task,
            TreeItemCollapsibleState.None,
            this.context,
            wsf,
          ),
        );
      }
    });
    return taskElements;
  }

  private getAllLaunchConfigs(wsf: vscode.WorkspaceFolder): TaskTreeItem[] {
    // 从其他来源获取config，暂不支持
    let launchElements: TaskTreeItem[] = [];
    let launch = workspace.getConfiguration("launch", wsf);
    const config = launch.get(
      "configurations",
    ) as Array<vscode.DebugConfiguration>;
    config.forEach((conf) => {
      launchElements.push(
        new TaskTreeItem(
          conf,
          TreeItemCollapsibleState.None,
          this.context,
          wsf,
        ),
      );
    });
    return launchElements;
  }
}

type QuickRunTreeItem = TaskTreeItem | WsfTreeItem;

export class WsfTreeItem extends TreeItem {
  constructor(
    name: string,
    collapsibleState: TreeItemCollapsibleState,
    public wsf: vscode.WorkspaceFolder,
  ) {
    super(name, collapsibleState);
    this.wsf = wsf;
  }
}

export class TaskTreeItem extends TreeItem {
  constructor(
    public readonly _task: vscode.Task | vscode.DebugConfiguration,
    public readonly collapsibleState: TreeItemCollapsibleState,
    private context: vscode.ExtensionContext,
    public readonly wsf: vscode.WorkspaceFolder,
  ) {
    super(_task.name, collapsibleState);
    let args: vscode.Task | vscode.DebugConfiguration;
    if (this._task instanceof vscode.Task) {
      args = this._task;
      this.iconPath = new vscode.ThemeIcon(TREEVIEW_ITEM_ICON_TASK);
    } else {
      args = _task as vscode.DebugConfiguration;
      this.iconPath = new vscode.ThemeIcon(TREEVIEW_ITEM_ICON_DEBUGCONF);
    }
    this.command = {
      title: "title",
      command: "bmx.quickrun.runItem",
      arguments: [args, wsf],
    };
    this.tooltip = this._task.name;
    this.contextValue = TREEVIEW_ITEM_CTX_TYPE_TASK;
  }
}
function run_xxx(
  task: TaskTreeItem | vscode.DebugConfiguration,
  wsf: vscode.WorkspaceFolder,
) {
  function runTask(task: vscode.Task) {
    tasks.executeTask(task);
  }

  function launchDebug(debugTask: vscode.DebugConfiguration) {
    vscode.debug.startDebugging(wsf, debugTask);
  }
  if (task instanceof vscode.Task) {
    runTask(task);
  } else {
    launchDebug(task as vscode.DebugConfiguration);
  }
}
export class TaskTreeViewManager {
  static view: vscode.TreeView<QuickRunTreeItem>;
  static tprovider: TaskDataProvider;

  static refreshCallback() {
    // tprovider.refresh()
  }

  static async init(context: vscode.ExtensionContext) {
    // this.treeDataProviderByFile = this.controller.getTreeDataProviderByFile();
    // vscode.TreeViewOptions
    if (!this.view) {
      this.tprovider = new TaskDataProvider(context);
      let view = vscode.window.createTreeView<QuickRunTreeItem>(
        "bmx_quickrun",
        {
          treeDataProvider: this.tprovider,
          // dragAndDropController: this.controller.tprovider,
          showCollapseAll: true,
          canSelectMany: true,
        },
      );
      this.view = view;
    }
    commands.registerCommand("bmx.quickrun.refresh", () =>
      this.tprovider.refresh(),
    );

    let disposable;
    disposable = commands.registerCommand(
      "bmx.quickrun.runItem",
      (
        task: TaskTreeItem | vscode.DebugConfiguration,
        wsf: vscode.WorkspaceFolder,
      ) => run_xxx(task, wsf),
    );
    context.subscriptions.push(disposable);
    disposable = commands.registerCommand(
      "bmx.quickrun.openProgramFile",
      async (item: TaskTreeItem) => {
        // 需要是python的运行配置，然后需要用workspaceFolder 才能用，其他情况待测试
        let path = (
          (item._task as vscode.DebugConfiguration).program as string
        ).replace("${workspaceFolder}", item.wsf.uri.path);
        let uri = vscode.Uri.file(path);
        try {
          // file exists, go to the file
          vscode.window.showTextDocument(uri);
        } catch {
          console.error("文件不存在");
        }
      },
    );
    context.subscriptions.push(disposable);

    disposable = commands.registerCommand(
      "bmx.quickrun.openLaunchJson",
      async (wsfTreeItem: WsfTreeItem) => {
        let launchjsonUri = vscode.Uri.joinPath(
          wsfTreeItem.wsf.uri,
          ".vscode",
          "launch.json",
        );
        try {
          await workspace.fs.stat(launchjsonUri);
        } catch {
          // file not exist
          let bytes = Uint8Array.from(
            "{}".split("").map((c) => c.charCodeAt(0)),
          );
          await workspace.fs.writeFile(launchjsonUri, bytes);
        }
        vscode.window.showTextDocument(launchjsonUri);
      },
    );
    context.subscriptions.push(disposable);

    disposable = commands.registerCommand(
      "bmx.quickrun.openTasksJson",
      async (wsfTreeItem: WsfTreeItem) => {
        let wsf;
        if (wsfTreeItem === undefined) {
          // called by command palette, get wsf with active editor
          wsf = commonUtil.getWsfWithActiveEditor();
        } else {
          wsf = wsfTreeItem.wsf;
        }
        let taskjsonUri = vscode.Uri.joinPath(wsf.uri, ".vscode", "tasks.json");
        try {
          await workspace.fs.stat(taskjsonUri);
        } catch {
          // file not exist
          const defaultJsonTasksPath = path.join(
            context.extensionPath,
            "resources",
            "tasks.json",
          );
          const content = fs.readFileSync(defaultJsonTasksPath, "utf-8");
          let bytes = Uint8Array.from(
            content.split("").map((c) => c.charCodeAt(0)),
          );
          await workspace.fs.writeFile(taskjsonUri, bytes);
        }
        vscode.window.showTextDocument(taskjsonUri);
      },
    );
    context.subscriptions.push(disposable);

    disposable = commands.registerCommand("bmx.quickrun.gotoStackTop", () =>
      vscode.commands.executeCommand("workbench.action.debug.callStackTop"),
    );
    context.subscriptions.push(disposable);

    disposable = commands.registerCommand(
      "bmx.quickrun.gotoTopOfDocument",
      () => {
        let document = vscode.window.activeTextEditor!.document;
        vscode.window.showTextDocument(document.uri, {
          selection: new vscode.Range(0, 0, 0, 0),
        });
      },
    );

    disposable = commands.registerCommand(
      "bmx.quickrun.gotoEndOfDocument",
      () => {
        let document = vscode.window.activeTextEditor!.document;
        vscode.window.showTextDocument(document.uri, {
          selection: new vscode.Range(
            document.lineCount,
            0,
            document.lineCount,
            0,
          ),
        });
      },
    );
    context.subscriptions.push(disposable);
  }
}
