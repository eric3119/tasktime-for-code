// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { start } from 'repl';
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "tasktime-for-code" is now active!'
  );
  let startTime: number | undefined;

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const startTimerHandler = vscode.commands.registerCommand(
    'tasktime-for-code.startTimer',
    () => {
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

      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage('Timer started!');

      // Get the current time
      startTime = new Date().getTime();

      // Get the current workspace folder
      const workspaceFolder = vscode.workspace.workspaceFolders;

      // Get the current file path
      const filePath = vscode.window.activeTextEditor?.document.fileName;

      // save the current time, workspace folder, file path and file name and start the timer in a txt file
      const fs = require('fs');
      const path = require('path');
      const dir = path.join(__dirname, 'tasktime-for-code');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      const file = path.join(dir, 'tasktime-for-code.txt');
      fs.appendFileSync(
        file,
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
      vscode.window.showInformationMessage('Running tests...');
      const stopTime = new Date().getTime();
      const fs = require('fs');
      const path = require('path');
      const dir = path.join(__dirname, 'tasktime-for-code');
      const file = path.join(dir, 'tasktime-for-code.txt');
      fs.appendFileSync(file, `Stop Time: ${stopTime} - `);

      // Run shell command to check code correctness
      const exec = require('child_process').exec;
      const command = config.get<string>('customCommand');
      if (!command) {
        vscode.window.showInformationMessage('No command found');
        return;
      }
      exec(command, (error: any, stdout: any, stderr: any) => {
        if (error) {
          vscode.window.showInformationMessage('Tests failed');
          fs.appendFileSync(file, `Error: ${error}`);
          console.error(`exec error: ${error}`);
          return;
        }
        vscode.window.showInformationMessage('Tests passed');
        fs.appendFileSync(file, `Tests passed\n`);
        if (startTime !== undefined) {
          fs.appendFileSync(file, `Total Time: ${stopTime - startTime}ms\n`);
        }
        startTime = undefined;
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      });
    }
  );

  context.subscriptions.push(startTimerHandler);
  context.subscriptions.push(stopTimerHandler);
}

// This method is called when your extension is deactivated
export function deactivate() {}
