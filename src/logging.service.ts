import kleur from 'kleur';

export class LoggingService {
    private serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;
    }

    private _getTimestamp() {
        return new Date().toISOString();
    }

    private _getCallerInfo() {
        const error = new Error();
        const stack = error.stack?.split('\n');
        if (stack) {
            // The caller's stack frame is usually the 4th or 5th in the array depending on the environment
            const callerLine = stack[4] || stack[3];
            if (callerLine) {
                // Regex to extract file path and line number
                const match = callerLine.match(/at\s+(.*):(\d+):\d+\)?$/);
                if (match) {
                    const filePath = match[1].split('/').pop(); // Extract file name from the full path
                    const lineNumber = match[2];
                    return `${filePath}:${lineNumber}`;
                }
            }
        }
        return 'unknown';
    }

    private _log(level: string, message: any, colorFunction: (input: string) => string) {
        const timestamp = this._getTimestamp();
        const callerInfo = this._getCallerInfo();
        console.log(
            colorFunction(`[${timestamp}] [${this.serviceName}] [${level.toUpperCase()}] [${callerInfo}] ${message}`)
        );
    }

    info(message: any) {
        this._log('info', message, kleur.blue);
    }

    warn(message: any) {
        this._log('warn', message, kleur.yellow);
    }

    error(message: any) {
        this._log('error', message, kleur.red);
    }

    success(message: any) {
        this._log('success', message, kleur.green);
    }

    debug(message: any) {
        this._log('debug', message, kleur.magenta);
    }

    trivial(message: any) {
        this._log('trivial', message, kleur.gray);
    }
}
