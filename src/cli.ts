import { Main } from './main'; // Assuming Main class is in main.ts
import * as dotenv from 'dotenv';
import 'colors'; // Import the colors library
import { LoggingService } from './logging.service';
import { readFileSync } from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import readlineSync from 'readline-sync';
import 'colors';


// Load environment variables from .env file
dotenv.config();

class CLI {
    private logger: LoggingService;
    private version: string;

    constructor() {
        this.logger = new LoggingService("CLI");
        this.version = this.getVersionFromFile();
        this.initializeCLI();

        process.on('SIGINT', () => {
            console.log('\nProcess interrupted. Exiting...'.red);
            process.exit(0);
        });
    }

    private getVersionFromFile(): string {
        try {
            const versionFilePath = 'version.txt';
            return readFileSync(versionFilePath, 'utf-8').trim();
        } catch (error) {
            this.logger.error(`Error reading version from version.txt: ${error}`);
            return 'unknown';
        }
    }

    private async initializeCLI() {
        const argv = await yargs(hideBin(process.argv)).parseAsync();
        if (!argv.help && !argv.h && !argv.version && !argv.v) {
            this.showBanner();
            this.showDisclaimer();
            this.waitForUserConfirmation();
        }

        this.setupCLI();
    }

    private showDisclaimer() {
        console.log(`
ER:
This tootes job applications on LinkedIn. 
Please use it rey and ensure it aligns with LinkedIn's terms of service.
By continuing, you acknohe risks and agree to proceed at your own discretion.
        `.yellow);
    }

    private waitForUserConfirmation() {
        const userInput = readlineSync.question('Press Enter to continue or type "abort" to exit...');
        if (userInput.toLowerCase() === 'abort') {
            console.log('Aborted.'.red);
            process.exit(0);
        }
    }

    private showBanner() {
        const banner = `
\x1b[37m⠀⠀⠀    ⠀⠀⠀  ⠀⠀⣠⡤⠀⠀⠀⠀⠀⠀⠀⠀⠀⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
\x1b[37m⠀⠀⠀⠀   ⠀⠀⠀⢀⡴⠊⠁⣇           ⡇⠉⠲⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
\x1b[37m     ⠀ ⠀⠀  ⡟⠀⡜⠀⠻           ⣿⡄⠸⡄⠘⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
\x1b[37m⠀⠀⠀       ⢿⠀⣾⡇⠀⠙⢧⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⠇⠁⢀⣿⡄⢸⠀⠀
\x1b[37m          ⢸⢸⣿⣷⠀⠐⡼⣆⠀⠀⠀⠀⠀⠀⠀⢀⡞⡄⠀⢸⣿⣷⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
\x1b[37m     ⠀⠀⠀⠀⢸⠸⣿⣿⣷⡀⠙⣿⣤⣤⡤⣀⣤⣤⣤⣾⡟⠀⣰⣿⣿⡏⢸\x1b[38;5;39m                    ,,                                     ,,    ,,   ⠀⠀⠀
\x1b[37m ⠀⠀⠀⠀⠀⠀⠀⢸⡆⠻⣿⣽⡿⠞⠁⠀⠼⠛⠋⠙⡋⠷⠤⠙⠾⣿⣹⣿⠁⡾\x1b[38;5;39m     ⠀⠀ 7MMF'        db              7MM                    7MM    db
\x1b[37m ⠀⠀⠀⠀⠀⠀⠀⠱⡠⡟⠉⣠⠀⢀⡴⠋⠀⢠⠀⠘⠓⢤⡀⢦⡈⠻⣧⡼⠁\x1b[38;5;39m         MM                            MM                     MM
\x1b[37m    ⠀⠀⠀⠀⠀⢻⡁⡰⠁⠰⠋⠀⠀⣠⠞⢦⡀⠀⠀⠑⠦⠳⡄⣿⠁\x1b[38;5;39m          MM         7MM    7MMpMMMb.   MM  ,MP'.gP"Ya    ,M""bMM   7MM  7MMpMMMb.
\x1b[37m ⠀⠀⠀⠀⠀ ⠀⠀⢀⣷⣾⡿⠿⠿⢿⣿⡍⠉⢉⣽⣿⠿⠿⠿⣷⣶⣏\x1b[38;5;39m⠀      ⠀⠀⠀ MM          MM    MM    MM    MM ;Y  ,M'   Yb ,AP    MM   MM    MM    MM
\x1b[37m⠀⠀⠀⠀⠀⠀ ⠀⠐⣾⣿⣿⣦⣤⣤⣴⣿⡿⠉⢹⣿⣷⣤⣤⣤⣿⣿⣿⠃\x1b[38;5;39m          MM      ,   MM    MM    MM    MM;Mm  8M"""""" 8MI    MM   MM    MM    MM
\x1b[37m      ⠀⠀⠀⢰⢿⣿⣿⣿⣿⣿⣿⣿⠇⠀⠀⢿⣿⣿⣿⣿⣿⢣\x1b[38;5;39m           MM     ,M   MM    MM    MM    MM Mb.YM.      , Mb    MM   MM    MM    MM
\x1b[37m       ⠀⠀⡇⠀⠿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠙⠿⣿⣿⣿⡿⠋\x1b[38;5;39m         .JMMmmmmMMM .JMML..JMML  JMML..JMML. YA.Mbmmd'  Wbmd"MML..JMML..JMML  JMML.\x1b[0m
\x1b[37m         ⡇⠀⢠⠼⠋⠁⠀⢤⣄⠀⠀⠀⢀⣤⠄⠀⠉⠻⢄⠀⠀
\x1b[37m         ⡇⠀⢨⠀⠀⡄⠀⠀⠈⢱⣦⡶⠋⠀⠀⠸⡄⠀⢸⠀⠀             https://github.com/Eyalm321/linkedin-job-applier-ai  \x1b[38;5;208m               ,,
\x1b[37m        ⠀⢳⡀⡸⣆⠀⢇⠀⠀⠀⠘⢾⠗⠀⠀⠀⢀⡇⠀⡼ \x1b[38;5;208m                                                                                 7MM
\x1b[37m        ⠀⢸⣷⡝⣾⣦⠈⠓⠒⠲⣶⣿⣷⣶⠖⠒⠋⢠⣾⠀\x1b[38;5;208m⠀⠀⠀                                                                                MM
\x1b[37m     ⠀⠀  ⠙⢿⣾⣿⣷⣦⡀⠀⠀⠀⠀⠀⠀⣠⣶⣿⣷⣾⢟⠀  \x1b[38;5;208m⠀  ⠀⠀ .gP"Ya   ,6"Yb.  ,pP"Ybd 7M'   MF'         ,6"Yb.   7MMpdMAo.  7MMpdMAo.  MM  7M'   MF'⠀
\x1b[37m ⠀          ⠻⣿⣿⣿⣿⣶⣤⣤⣤⣴⣾⣿⣿⣿⣿⠃   \x1b[38;5;208m⠀    ,M'   Yb  8)    MM  8I   " VA   ,V           8)   MM    MM   Wb  MM    Wb  MM   VA   ,V
\x1b[37m   ⠀⠀⠀       ⠈⠙⢿⣿⣿⣿⣿⣿⣿⠛⠉    \x1b[38;5;208m       8M""""""  ,pm9MM   YMMMa.   VA  ,V           ,pm9MM     MM    M8  MM    M8  MM    VA, V
\x1b[37m                ⠀⠙⠿⣿⣿⣿⡿⠟⠁⠀     \x1b[38;5;208m⠀    YM.    , 8M   MM  L.   I8    VVV             8M   MM   MM   ,AP  MM   ,AP  MM     VVV
\x1b[37m                  ⠀⠀⠀⠙⠁⠀⠀⠀      \x1b[38;5;208m     Mbmmd    Moo9^Yo.M9mmmP'   , V               Moo9^Yo.  MMbmmd'   MMbmmd' .JMML.  ,V
\x1b[37m                                  \x1b[38;5;208m                              ,V                          MM        MM             ,V
\x1b[37m                                  \x1b[38;5;208m                            OOb"                        .JMML.    .JMML.        OOb"
`;
        console.log(banner);
    }



    private setupCLI() {
        yargs(hideBin(process.argv))
            .version(false)
            .usage('Usage: $0 [options]')
            .option('model', {
                alias: 'm',
                type: 'string',
                description: 'Override MODEL environment variable. If specified, this value will be used instead of the default model configured in your environment variables.',
            })
            .option('provider', {
                alias: 'p',
                type: 'string',
                choices: ['openai', 'anthropic', 'ollama'],
                description: `Specify the provider to use (openai, anthropic, ollama). This will override the corresponding environment variable settings.
                            - For 'openai', you need to specify the --apiKey option.
                            - For 'anthropic', you need to specify the --apiKey option.
                            - For 'ollama', you need to specify the --baseUrl option.`,
            })
            .option('apiKey', {
                alias: 'k',
                type: 'string',
                description: `API key for the chosen provider. Required if the provider is 'openai' or 'anthropic'.`,
            })
            .option('baseUrl', {
                alias: 'b',
                type: 'string',
                description: `Base URL for Ollama API. Required if the provider is 'ollama'. Overrides the OLLAMA_BASE_URL environment variable.`,
            })
            .option('temperature', {
                alias: 't',
                type: 'number',
                description: 'Set the temperature for the model, which affects the randomness of the output. This overrides the TEMPERATURE environment variable.',
            })
            .option('version', {
                alias: 'v',
                type: 'boolean',
                description: 'Show version number',
                handler: () => {
                    console.log(`CLI Tool Version: ${this.version}`);
                    process.exit(0);
                }
            })
            .help('h')
            .alias('h', 'help')
            .example([
                ['$0 --model myModel', 'Override the OLLAMA_MODEL with "myModel"'],
                ['$0 --provider openai --apiKey your_openai_api_key', 'Use OpenAI as the provider with the specified API key'],
                ['$0 --provider ollama --baseUrl http://localhost:11434', 'Use a custom Ollama base URL'],
                ['$0 --temperature 0.7', 'Set the temperature to 0.7 for more diverse output'],
            ])
            .parseAsync()
            .then(async (argv) => {
                if (argv.model) {
                    process.env.OLLAMA_MODEL = argv.model as string;
                }
                if (argv.provider) {
                    this.clearProvider();
                    if (argv.provider === 'openai') {
                        process.env.OPENAI_API_KEY = argv.apiKey as string;
                    } else if (argv.provider === 'anthropic') {
                        process.env.ANTHROPIC_API_KEY = argv.apiKey as string;
                    } else if (argv.provider === 'ollama') {
                        process.env.OLLAMA_BASE_URL = argv.baseUrl as string;
                    }
                }
                if (argv.temperature) {
                    process.env.TEMPERATURE = argv.temperature.toString();
                }

                const main = new Main();
                try {
                    await main.initialize();
                } catch (error) {
                    this.logger.error(`Error initializing Main: ${error}`);
                    process.exit(1);
                }
            })
            .catch(async (err) => {
                this.logger.error(`Error parsing arguments: ${err}`);
            });
    }


    private clearProvider() {
        process.env.OPENAI_API_KEY = undefined;
        process.env.ANTHROPIC_API_KEY = undefined;
        process.env.OLLAMA_BASE_URL = undefined;
    }
}

new CLI();
