TaskTimer for Code – Automate Execution with a Timer

TaskTimer for Code is a VS Code extension that runs a timer and executes a Java command when it stops. If the command fails, the timer continues running, ensuring automated retries. This extension is ideal for developers who need periodic execution with failure handling.
Features:

✅ Set a custom timer to trigger execution
✅ Run Java commands automatically
✅ Retry execution on failure
✅ Seamless integration with VS Code

Perfect for developers working with automation, testing, or background tasks.

https://drive.google.com/file/d/12nDIpJVHMy50QUYlXWX95K5aFpWU2r_S/view?usp=drive_link

## Compilation
```bash	
npx vsce package # Create a .vsix file
```

```bash
code --install-extension tasktime-for-code-0.0.1.vsix # Install the extension
```