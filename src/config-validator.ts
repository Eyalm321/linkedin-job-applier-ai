import * as fs from 'fs';
import { ConfigParameters, DateFilters, ExperienceLevel, JobTypes } from './config.interface';

export class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConfigError";
    }
}

export class ConfigValidator {
    private requiredKeys: Record<keyof ConfigParameters, string> = {
        remote: 'boolean',
        experienceLevel: 'object',
        jobTypes: 'object',
        date: 'object',
        positions: 'array',
        locations: 'array',
        distance: 'number',
        companyBlacklist: 'array',
        titleBlacklist: 'array',
        outputFileDirectory: 'string',
        uploads: 'object'
    };

    private experienceLevels: Array<keyof ExperienceLevel> = ['internship', 'entry', 'associate', 'mid-senior level', 'director', 'executive'];
    private jobTypes: Array<keyof JobTypes> = ['full-time', 'contract', 'part-time', 'temporary', 'internship', 'other', 'volunteer'];
    private dateFilters: Array<keyof DateFilters> = ['all time', 'month', 'week', '24 hours'];
    private approvedDistances = new Set([0, 5, 10, 25, 50, 100]);

    validateConfig(configJsonPath: fs.PathLike): ConfigParameters {
        const fileContent = fs.readFileSync(configJsonPath, 'utf8');
        const parameters: ConfigParameters = JSON.parse(fileContent);

        this.checkRequiredKeys(parameters, configJsonPath);
        this.checkExperienceLevels(parameters, configJsonPath);
        this.checkJobTypes(parameters, configJsonPath);
        this.checkDateFilters(parameters, configJsonPath);
        this.checkPositions(parameters, configJsonPath);
        this.checkLocations(parameters, configJsonPath);
        this.checkDistance(parameters, configJsonPath);
        this.checkBlacklists(parameters, configJsonPath);

        return parameters;
    }

    private checkRequiredKeys(parameters: ConfigParameters, configJsonPath: fs.PathLike): void {
        for (const key in this.requiredKeys) {
            const expectedType = this.requiredKeys[key as keyof ConfigParameters];
            if (!(key in parameters)) {
                if (key === 'companyBlacklist' || key === 'titleBlacklist') {
                    (parameters[key as keyof ConfigParameters] as string[]) = [];
                } else {
                    throw new ConfigError(`Missing or invalid key '${key}' in config file ${configJsonPath}`);
                }
            } else if (typeof parameters[key as keyof ConfigParameters] !== expectedType && !(expectedType === 'array' && Array.isArray(parameters[key as keyof ConfigParameters]))) {
                if ((key === 'companyBlacklist' || key === 'titleBlacklist') && parameters[key as keyof ConfigParameters] === null) {
                    (parameters[key as keyof ConfigParameters] as string[]) = [];
                } else {
                    throw new ConfigError(`Invalid type for key '${key}' in config file ${configJsonPath}. Expected ${expectedType}.`);
                }
            }
        }
    }

    private checkExperienceLevels(parameters: ConfigParameters, configJsonPath: fs.PathLike): void {
        for (const level of this.experienceLevels) {
            if (typeof parameters.experienceLevel[level] !== 'boolean') {
                throw new ConfigError(`Experience level '${level}' must be a boolean in config file ${configJsonPath}`);
            }
        }
    }

    private checkJobTypes(parameters: ConfigParameters, configJsonPath: fs.PathLike): void {
        for (const jobType of this.jobTypes) {
            if (typeof parameters.jobTypes[jobType] !== 'boolean') {
                throw new ConfigError(`Job type '${jobType}' must be a boolean in config file ${configJsonPath}`);
            }
        }
    }

    private checkDateFilters(parameters: ConfigParameters, configJsonPath: fs.PathLike): void {
        for (const dateFilter of this.dateFilters) {
            if (typeof parameters.date[dateFilter] !== 'boolean') {
                throw new ConfigError(`Date filter '${dateFilter}' must be a boolean in config file ${configJsonPath}`);
            }
        }
    }

    private checkPositions(parameters: ConfigParameters, configJsonPath: fs.PathLike): void {
        if (!parameters.positions.every(pos => typeof pos === 'string')) {
            throw new ConfigError(`'positions' must be a list of strings in config file ${configJsonPath}`);
        }
    }

    private checkLocations(parameters: ConfigParameters, configJsonPath: fs.PathLike): void {
        if (!parameters.locations.every(loc => typeof loc === 'string')) {
            throw new ConfigError(`'locations' must be a list of strings in config file ${configJsonPath}`);
        }
    }

    private checkDistance(parameters: ConfigParameters, configJsonPath: fs.PathLike): void {
        if (!this.approvedDistances.has(parameters.distance)) {
            throw new ConfigError(`Invalid distance value in config file ${configJsonPath}. Must be one of: ${[...this.approvedDistances].join(', ')}`);
        }
    }

    private checkBlacklists(parameters: ConfigParameters, configJsonPath: fs.PathLike): void {
        for (const blacklist of ['companyBlacklist', 'titleBlacklist']) {
            if (!Array.isArray(parameters[blacklist as keyof ConfigParameters])) {
                throw new ConfigError(`'${blacklist}' must be a list in config file ${configJsonPath}`);
            }
        }
    }
}
