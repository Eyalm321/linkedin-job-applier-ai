export interface PersonalInformation {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    country: string;
    city: string;
    address: string;
    phone_country_code: string;
    phone: string;
    email_address: string;
    github: string;
    linkedin: string;
}

export interface EducationDetail {
    degree: string;
    university: string;
    gpa: string;
    graduation_year: string;
    field_of_study: string;
}

export interface ExperienceDetail {
    position: string;
    company: string;
    employment_period: string;
    location: string;
    industry: string;
    key_responsibilities: string[];
    skills_acquired: string[];
}


export interface Achievement {
    name: string;
    description: string;
}

export interface Language {
    language: string;
    proficiency: string;
}

export interface LegalAuthorization {
    eu_work_authorization: string;
    us_work_authorization: string;
    requires_us_visa: string;
    requires_us_sponsorship: string;
    requires_eu_visa: string;
    legally_allowed_to_work_in_eu: string;
    legally_allowed_to_work_in_us: string;
    requires_eu_sponsorship: string;
}

export interface WorkPreferences {
    remote_work: string;
    in_person_work: string;
    open_to_relocation: string;
    willing_to_complete_assessments: string;
    willing_to_undergo_drug_tests: string;
    willing_to_undergo_background_checks: string;
}

export interface SelfIdentification {
    gender: string;
    pronouns: string;
    veteran: string;
    disability: string;
    ethnicity: string;
}

export interface Skills {
    libraries: string;
    general_skills: string;
    programming_languages: string;
    integrations: string;
    design: string;
    databases: string;
    IT: string;
    environments: string;
    server: string;
}

export interface Resume {
    personal_information: PersonalInformation;
    education_details: EducationDetail[];
    experience_details: ExperienceDetail[];
    skills: Skills;
    projects: string[];  // Adjust as needed
    achievements: Achievement[];
    certifications: string[];  // Adjust as needed
    languages: Language[];
    interests: string[];  // Adjust as needed
    availability: {
        notice_period: string;
    };
    salary_expectations: {
        salary_range_usd: string;
    };
    self_identification: SelfIdentification;
    legal_authorization: LegalAuthorization;
    work_preferences: WorkPreferences;
}
