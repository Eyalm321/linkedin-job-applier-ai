class Job {
    title: string;
    company: string;
    location: string;
    link: string;
    apply_method: string;
    description: string = "";
    summarize_job_description: string = "";
    pdf_path: string = "";
    recruiter_link: string = "";
    resumePath: string = "";

    constructor(
        title: string,
        company: string,
        location: string,
        link: string,
        apply_method: string,
        description: string = "",
        summarize_job_description: string = "",
        pdf_path: string = "",
        recruiter_link: string = "",
        resumePath: string = ""
    ) {
        this.title = title;
        this.company = company;
        this.location = location;
        this.link = link;
        this.apply_method = apply_method;
        this.description = description;
        this.summarize_job_description = summarize_job_description;
        this.pdf_path = pdf_path;
        this.recruiter_link = recruiter_link;
        this.resumePath = resumePath;
    }

    setSummarizeJobDescription(summarize_job_description: string): void {
        this.summarize_job_description = summarize_job_description;
    }

    setJobDescription(description?: string): void {
        if (!description) {
            return;
        }
        this.description = description;
    }

    setRecruiterLink(recruiter_link: string): void {
        this.recruiter_link = recruiter_link;
    }

    formattedJobInformation(): string {
        /**
         * Formats the job information as a markdown string.
         */
        const job_information = `
        # Job Description
        ## Job Information 
        - Position: ${this.title}
        - At: ${this.company}
        - Location: ${this.location}
        - Recruiter Profile: ${this.recruiter_link !== '' ? this.recruiter_link : 'Not available'}
        
        ## Description
        ${this.description || 'No description provided.'}
        `;
        return job_information.trim();
    }
}

export { Job };