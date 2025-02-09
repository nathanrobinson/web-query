import puppeteer, { Page } from 'puppeteer';
import minimist from 'minimist';
import { Arguments } from './arguments';

const HELP_STRING = `🕸⁉ Web Query
Usage:
  web-query [-d|--debug] [-q|--query "selector"] "url"
    -q | --query: Query the document using a valid CSS selector and print the innerText.
      Multiple -q and corresponding queries can be provided and matches will be printed on new lines.
      web-query will automatically exit after the last query is run.
    
    -d | --debug: Open the dev tools.
    
    url: The url to open. "https://" is automatically prepended to the url if it is not included.
`

class WebQuery {

  #debug = false;
  #selectors: string[] = [];
  #url: string = '';

  async run(args: string[]): Promise<void> {
    this.#parseArguments(args);
    
    if (!this.#url) {
      console.error(HELP_STRING);
      process.exit(1);
    }

    await this.#createWindow();
  }

  #parseArguments(args: string[]) {
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
  }

  async #createWindow(): Promise<void> {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: {width: 1080, height: 1024},
    });
    browser.on('disconnected', () => process.exit(2));

    const page = await browser.newPage();
    page.on('close', () => browser.close());
    const status = await page.goto(this.#url);

    if (!status.ok()) {
      process.exit(status.status());
    }

    await this.#queryDocument(page);
    process.exit();
  }

  async #queryDocument(page: Page): Promise<void> {
    for (const selector of this.#selectors) {
      try {
        // select the element
        const element = await page.waitForSelector(selector);
        // grab the textContent from the element, by evaluating this function in the browser context
        const value = await element.evaluate(el => el.textContent);
        console.log(value);
      } catch (error) {
        console.error(error);
      }
    }
  }
}

new WebQuery().run(process.argv.slice(2))
