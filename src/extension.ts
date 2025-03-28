// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const TIMER_STORAGE_KEY = 'vscode-timer:storage-key';

let statusBarItem: vscode.StatusBarItem;
let timerRef: NodeJS.Timeout;

const terminal = vscode.window.createTerminal();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "tasktime-for-code" is now active!'
  );
  let startTime: number | undefined;

  // create timer status item
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left
    );
    statusBarItem.command = 'tasktime-for-code.stopTimer';
  }

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const startTimerHandler = vscode.commands.registerCommand(
    'tasktime-for-code.startTimer',
    async () => {
      if (vscode.window.activeTextEditor === undefined) {
        vscode.window.showInformationMessage(
          'Please open a file to start the timer'
        );
        return;
      }

      if (vscode.workspace.workspaceFolders === undefined) {
        vscode.window.showInformationMessage(
          'Please open a folder to start the timer'
        );
        return;
      }

      if (startTime !== undefined) {
        vscode.window.showInformationMessage('Timer already started!');
        return;
      }

      const timerDuration = '5m0s'; // default timer duration

      // keep track of timer duration
      await setStateTimerDuration(timerDuration, context);

      // clear previous timers if any and create new timer
      clearInterval(timerRef);
      const updateFn = async (firstUpdate: boolean = false) => {
        const secondsRemaining =
          getStateTimerDurationSeconds(context) - (firstUpdate ? 0 : 1);
        const cancelTimer = secondsRemaining === 0;
        if (cancelTimer) {
          clearInterval(timerRef);
          await setStateTimerDurationSeconds(0, context);
          updateStatus(secondsToTimerDuration(secondsRemaining), true);
          return;
        }
        await setStateTimerDurationSeconds(secondsRemaining, context);
        updateStatus(secondsToTimerDuration(secondsRemaining));
      };

      // first update
      updateFn(true);
      timerRef = setInterval(updateFn, 1000);

      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage('Timer started!');

      // Get the current time
      startTime = new Date().getTime();

      // Get the current workspace folder
      const workspaceFolder = vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders[0].name
        : 'Unknown Workspace';

      // Get the current file path
      const filePath = vscode.window.activeTextEditor?.document.fileName;

      appendLineAtHomeFolderDataset(
        `Start Time: ${startTime} - Workspace Folder: ${workspaceFolder} - File Path: ${filePath}\n`
      );
    }
  );

  const stopTimerHandler = vscode.commands.registerCommand(
    'tasktime-for-code.stopTimer',
    () => {
      if (startTime === undefined) {
        vscode.window.showInformationMessage('Timer not started!');
        return;
      }

      const config = vscode.workspace.getConfiguration('tasktime-for-code');

      vscode.window.showInformationMessage('Stop Timer!');

      const stopTime = new Date().getTime();
      appendLineAtHomeFolderDataset(`Stop Time: ${stopTime} - `);

      // Run shell command to check code correctness
      const exec = require('child_process').exec;
      const command = config.get<string>('customCommand');
      if (!command) {
        vscode.window.showInformationMessage('No command found');
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : undefined;

      if (!workspaceFolder) {
        vscode.window.showInformationMessage('No workspace folder found');
        return;
      }

      vscode.window.showInformationMessage(
        'Running tests at ' + workspaceFolder
      );

      // temp file to store output
      const output = path.join(os.homedir(), 'output.txt');
      const writeStream = fs.createWriteStream(output);

      if (os.platform() === 'win32') {
        terminal.sendText(
          'Get-Content ' + os.homedir() + '/output.txt -Wait',
          true
        );
      } else {
        terminal.sendText('tail -f ' + os.homedir() + '/output.txt', true);
      }
      terminal.show();

      const ls = spawn(command, { cwd: workspaceFolder, shell: true });
      ls.stdout.on('data', (data: string) => {
        writeStream.write(data);
      });

      ls.stderr.on('data', (data: string) => {
        vscode.window.showInformationMessage('Command failed');
        appendLineAtHomeFolderDataset(`Error: ${data}`);
      });

      ls.on('error', (error: Error) => {
        console.log(`error: ${error.message}`);
        vscode.window.showInformationMessage('Tests failed');
      });

      ls.on('close', (code: number) => {
        console.log(`child process exited with code ${code}`);
        if (code === 0) {
          vscode.window.showInformationMessage('Tests passed');
        } else {
          vscode.window.showInformationMessage('Tests failed');
        }
        terminal.dispose();
        writeStream.end();
      });
    }
  );

  context.subscriptions.push(startTimerHandler);
  context.subscriptions.push(stopTimerHandler);
}

function appendLineAtHomeFolderDataset(data: string) {
  const dir = path.join(os.homedir(), 'tasktime-for-code');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  const file = path.join(dir, 'tasktime-for-code.txt');
  fs.appendFileSync(file, data);
}

function getStateTimerDurationSeconds(
  context: vscode.ExtensionContext
): number {
  return parseInt(context.globalState.get(TIMER_STORAGE_KEY, '0'));
}

async function setStateTimerDurationSeconds(
  timerDurationSeconds: number,
  context: vscode.ExtensionContext
): Promise<void> {
  await context.globalState.update(
    TIMER_STORAGE_KEY,
    Math.max(0, timerDurationSeconds)
  );
}

async function setStateTimerDuration(
  timerDuration: string,
  context: vscode.ExtensionContext
): Promise<void> {
  const [mm, hh, ss] = parseTimerDuration(timerDuration);
  const seconds = mm * 60 + hh * 3600 + ss;
  await setStateTimerDurationSeconds(seconds, context);
}

function parseTimerDuration(timerDuration: string): number[] {
  const regex = /(\d+)([hH]|[mM]|[sS])/g;
  const matches = timerDuration.match(regex);
  if (!matches) {
    return [0, 0];
  }
  let mm = 0;
  let hh = 0;
  let ss = 0;
  for (const match of matches) {
    const num = parseInt(match.slice(0, -1));
    if (match.endsWith('h') || match.endsWith('H')) {
      hh = num;
    } else if (match.endsWith('m') || match.endsWith('M')) {
      mm = num;
    } else {
      ss = num;
    }
  }
  return [mm, hh, ss];
}

function updateStatus(timerDuration: string, hide: boolean = false): void {
  statusBarItem.text = `Time remaining: ${timerDuration}`;
  if (hide) {
    statusBarItem.hide();
  } else {
    statusBarItem.show();
  }
}

function secondsToTimerDuration(seconds: number): string {
  const hh = Math.floor(seconds / 3600) || 0;
  const mm = Math.floor((seconds % 3600) / 60) || 0;
  const ss = Math.floor(seconds % 60) || 0;
  if (hh === 0) {
    return `${mm}m ${ss}s`;
  }
  return `${hh}h ${mm}m ${ss}s`;
}

// this method is called when extension is deactivated
export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  clearInterval(timerRef);
}
