export interface ConfigParameters {
    remote: boolean;
    experienceLevel: ExperienceLevel;
    jobTypes: JobTypes;
    date: DateFilters;
    positions: string[];
    locations: string[];
    distance: number;
    companyBlacklist: string[];
    titleBlacklist: string[];
    outputFileDirectory: string;
    uploads: {
        resume: string;
        cv: string;
    };
}

export type ExperienceLevel = {
    internship: boolean;
    entry: boolean;
    associate: boolean;
    "mid-senior level": boolean;
    director: boolean;
    executive: boolean;
};

export type JobTypes = {
    "full-time": boolean;
    contract: boolean;
    "part-time": boolean;
    temporary: boolean;
    internship: boolean;
    other: boolean;
    volunteer: boolean;
};

export type DateFilters = {
    "all time": boolean;
    month: boolean;
    week: boolean;
    "24 hours": boolean;
};