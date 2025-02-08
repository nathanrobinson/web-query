import { app, BrowserWindow, WebContents } from 'electron';
import minimist from 'minimist';
import { Arguments } from './arguments';

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

class WebQuery {

  #debug = false;
  #selectors: string[] = [];
  #url: string = MAIN_WINDOW_WEBPACK_ENTRY;

  constructor(args: string[]) {
    const options = {
      string: ['query', '_'],
      boolean: ['debug'],
      alias: {
          d: 'debug',
          q: 'query'
      }
    };
    var parsedArguments: Arguments = minimist(args, options) as unknown as Arguments;
    if (parsedArguments.debug) {
      this.#debug = true;
    }

    if (typeof parsedArguments.query === 'string') {
      this.#selectors = [parsedArguments.query];
    } else if(parsedArguments.query?.length) {
      this.#selectors = parsedArguments.query;
    }

    if (parsedArguments._?.length) {
      this.#url = 'https://' + parsedArguments._[0].replace(/^.*:\/\//, '');
    }
    
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', () => this.#createWindow());

    app.on('window-all-closed', () => this.#onAllClosed());

    app.on('activate', () => this.#onActivate());
  }

  #createWindow(): void {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
      height: 900,
      width: 1800,
      webPreferences: {
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      },
      show: false
    });

    // and load the index.html of the app.
    mainWindow.loadURL(this.#url);

    mainWindow.once('ready-to-show', () => {
      mainWindow.show()
    });

    mainWindow.webContents.on('did-navigate', (e, url, code, status) => {
      if (this.#selectors?.length && code === 200 && url.startsWith(this.#url)) {
        this.#queryDocument(mainWindow.webContents);
      }
    });

    if (this.#debug) {
      // Open the DevTools.
      mainWindow.webContents.openDevTools();
    }
  }

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  #onAllClosed(): void {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  #onActivate() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      this.#createWindow();
    }
  }

  async #queryDocument(contents: WebContents): Promise<void> {
    let isError = false;
    for (const selector of this.#selectors) {
      try {
        const result = await contents.executeJavaScript(`document.querySelector('${selector}')?.innerText`);
        console.log(result);
      } catch (error) {
        console.error(error);
        isError = true;
      }
    }

    if (!isError) {
      app.quit();
    }
  }
}

new WebQuery(process.argv.slice(2))

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
