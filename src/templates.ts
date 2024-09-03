export class Templates {
   public numberExtractionTemplate = `
Extract the number from the following text.

## Rules
- Provide only the number extracted from the text.
- The number should be a whole number.
- The number should be the only content in the answer.

## Example
Text: "I have 5 years of experience in software development."
Number: 5

## Text
{text}
   `;

   public personalInformationTemplate = `
Answer the following question based on the provided personal information.

## Rules
- Answer questions directly.

## Example
My resume: John Doe, born on 01/01/1990, living in Milan, Italy.
Question: What is your city?
Milan

Personal Information: {resume_section}
Question: {question}
`;

   public selfIdentificationTemplate = `
Answer the following question based on the provided self-identification details.

## Rules
- Answer questions directly.

## Example
My resume: Male, uses he/him pronouns, not a veteran, no disability.
Question: What are your gender?
Male

Self-Identification: {resume_section}
Question: {question}
`;

   public legalAuthorizationTemplate = `
Answer the following question based on the provided legal authorization details.

## Rules
- Answer questions directly.
- Answer with Yes or No if the question is a yes/no question.

## Example
My resume: Authorized to work in the EU, no US visa required.
Question: Are you legally allowed to work in the EU?
Yes

Legal Authorization: {resume_section}
Question: {question}
`;

   public workPreferencesTemplate = `
Answer the following question based on the provided work preferences.

## Rules
- Answer questions directly.
- If the question is about how I heard about the job, boast about the company by saying you have been following them for a while.

## Example
My resume: Open to remote work, willing to relocate.
Question: Are you open to remote work?
Yes

Work Preferences: {resume_section}
Question: {question}
`;

   public educationDetailsTemplate = `
Answer the following question based on the provided education details.

## Rules
- Answer questions directly.
- Education details are strictly related to academic qualifications.
- If the question is a numerical question, answer with a number.
- If the question is a yes/no question, answer with Yes or No.
- Answer questions strictly, distinguishing between different degree to certifications, by providing an answer based on the provided education details.

## Education Details:
{resume_section}

## Question:
{question}
`;

   public experienceDetailsTemplate = `
Your job is to answer the question based on the provided experience details.

## Rules
- Answer questions directly.
- If it seems likely that the cadidate have the experience, even if not explicitly defined, answer as if he has the experience.
- Does the job description requires a skillset that is similiar to the candidate's resume? if so, candidate likely to have the requirements.
- If the question is a numerical question, answer with a number.
- If the question is a yes/no question, answer with Yes or No.
- If the question is an open-ended question, answer with a relevant response.
- If the question is "Headline", answer with the job title of the candidate.
- If unsure, side with the candidate having the experience within a reasonable doubt.
- Keep the answer under 140 characters.

## Example
My resume: 3 years of experience with Docker.
Question: Do you have experience with Kubernetes?
Reasoning: Since the candidate has experience with Docker, it is likely that they have experience with Kubernetes.
Answer: Yes, I have experience with Kubernetes.

My resume: 5 years of experience in Java, Python, and C++.
Question: Do you have experience with C#?
Reasoning: Since the candidate has experience with similar languages, it is likely that they have experience with C#.
Answer: I have some experience with C#.

My resume: 4 years of experience with React and Angular.
Question: How many years of work experience do you have with Cascading Style Sheets (CSS)?
Reasoning: Since the candidate has experience with front-end frameworks, it is likely that they have experience with CSS.
Answer: 4

Notice that "Do you have experience with" is an opened question, while "How many years of work experience do you have with" is a numerical question.

Job Description: {job_description}
Experience Details: {resume_section}
Skills: {skills}

Question: {question}

Remember, if the question is a numerical question (usually starts with how many), answer ONLY with a number. 
`;

   public projectsTemplate = `
Answer the following question based on the provided project details.

## Rules
- Answer questions directly.
- If it seems likely that you have the experience, even if not explicitly defined, answer as if you have the experience.
- Keep the answer under 140 characters.

## Example
My resume: Led the development of a mobile app, repository available.
Question: Have you led any projects?
Yes, led the development of a mobile app

Projects: {resume_section}
Question: {question}
`;

   public availabilityTemplate = `
Answer the following question based on the provided availability details.

## Rules
- Answer questions directly.
- Keep the answer under 140 characters.
- Use periods only if the answer has multiple sentences.

## Example
My resume: Available to start immediately.
Question: When can you start?
I can start immediately.

Availability: {resume_section}
Question: {question}

Remember , the answer should be in favor of the candidate having the experience.
`;

   public salaryExpectationsTemplate = `
Answer the following question based on the provided salary expectations.

## Rules
- Answer questions directly.
- Keep the answer under 140 characters.
- Use periods only if the answer has multiple sentences.

Salary Expectations: {resume_section}
Question: {question}
`;

   public certificationsTemplate = `
Answer the following question based on the provided certifications.

## Rules
- Answer questions directly.
- If it seems likely that you have the experience, even if not explicitly defined, answer as if you have the experience.
- If unsure, respond with "I have no experience with that, but I learn fast" or "Not yet, but willing to learn."
- Keep the answer under 140 characters.

## Example
My resume: Certified in Project Management Professional (PMP).
Question: Do you have PMP certification?
Yes, I am PMP certified.

Certifications: {resume_section}
Question: {question}
`;

   public languagesTemplate = `
Answer the following question based on the provided language skills.

## Rules
- Answer questions directly.
- If it seems likely that you have the experience, even if not explicitly defined, answer as if you have the experience.
- If unsure, respond with "I have no experience with that, but I learn fast" or "Not yet, but willing to learn."
- Keep the answer under 140 characters.

## Example
My resume: Fluent in Italian and English.
Question: What languages do you speak?
Fluent in Italian and English.

Languages: {resume_section}
Question: {question}
`;

   public interestsTemplate = `
Answer the following question based on the provided interests.

## Rules
- Answer questions directly.
- Keep the answer under 140 characters.
- Use periods only if the answer has multiple sentences.

## Example
My resume: Interested in AI and data science.
Question: What are your interests?
AI and data science.

Interests: {resume_section}
Question: {question}
`;

   public summarizePromptTemplate = `
As a seasoned HR expert, your task is to identify and outline the key skills and requirements necessary for the position of this job. Use the provided job description as input to extract all relevant information. This will involve conducting a thorough analysis of the job's responsibilities and the industry standards. You should consider both the technical and soft skills needed to excel in this role. Additionally, specify any educational qualifications, certifications, or experiences that are essential. Your analysis should also reflect on the evolving nature of this role, considering future trends and how they might affect the required competencies.

Rules:
Remove boilerplate text
Include only relevant information to match the job description against the resume

# Analysis Requirements
Your analysis should include the following sections:
Technical Skills: List all the specific technical skills required for the role based on the responsibilities described in the job description.
Soft Skills: Identify the necessary soft skills, such as communication abilities, problem-solving, time management, etc.
Educational Qualifications and Certifications: Specify the essential educational qualifications and certifications for the role.
Professional Experience: Describe the relevant work experiences that are required or preferred.
Role Evolution: Analyze how the role might evolve in the future, considering industry trends and how these might influence the required skills.

# Final Result:
Your analysis should be structured in a clear and organized document with distinct sections for each of the points listed above. Each section should contain:
This comprehensive overview will serve as a guideline for the recruitment process, ensuring the identification of the most qualified candidates.

# Job Description:
\`\`\`
{text}
\`\`\`

---

# Job Description Summary
`;

   public coverLetterTemplate = `
Compose a brief and impactful cover letter based on the provided job description and resume.
The letter should be no longer than three paragraphs and should be written in a professional, yet conversational tone.
Avoid using any placeholders, and ensure that the letter flows naturally and is tailored to the job.

Analyze the job description to identify key qualifications and requirements.
Introduce the candidate succinctly, aligning their career objectives with the role.
Highlight relevant skills and experiences from the resume that directly match the job’s demands,
using specific Keywords to illustrate these qualifications. Reference notable aspects of the company,
such as its mission or values, that resonate with the candidate’s professional goals.
Conclude with a strong statement of why the candidate is a good fit for the position, expressing a desire to discuss further.

Please write the cover letter in a way that directly addresses the job role and the company’s characteristics,
ensuring it remains concise and engaging without unnecessary embellishments.
The letter should be formatted into paragraphs and should not include a greeting or signature.

## Rules:
- Provide only the text of the cover letter.
- Do not include any introductions, explanations, or additional information.
- The letter should be formatted into paragraph.
- If the question is "Headline", answer with a headline like "Why I am the best candidate for the Software Engineer position",
you can come up with your own headlines based on context.
- If the question is "Summary", answer with a summary of the cover letter.
- If the question is neither "Headline" nor "Summary", in regards to the job description, answer with a relevant response, tailored to the job description.

## Question:
{question}

## Job Description:
{job_description}

## My resume:
{resume}
`;

   public numericQuestionTemplate = `
Read the following resume carefully and answer the specific questions regarding the candidate's experience with a number of years. Follow these strategic guidelines when responding:

1. **Related and Inferred Experience:**
   - **Similar Technologies:** If experience with a specific technology is not explicitly stated, but the candidate has experience with similar or related technologies, provide a plausible number of years reflecting this related experience. For instance, if the candidate has experience with Python and projects involving technologies similar to Java, estimate a reasonable number of years for Java.
   - **Projects and Studies:** Examine the candidate’s projects and studies to infer skills not explicitly mentioned. Complex and advanced projects often indicate deeper expertise.

2. **Indirect Experience and Academic Background:**
   - **Type of University and Studies:** Consider the type of university and course followed.
   - **Exam Grades:** Consider exam grades achieved. High grades in relevant subjects can indicate stronger proficiency and understanding.
   - **Relevant thesis:** Consider the thesis of the candidate has worked. Advanced projects suggest deeper skills.
   - **Roles and Responsibilities:** Evaluate the roles and responsibilities held to estimate experience with specific technologies or skills.


3. **Experience Estimates:**
   - **No Zero Experience:** A response of "0" is absolutely forbidden. If direct experience cannot be confirmed, provide a minimum of "2" years based on inferred or related experience.
   - **For Low Experience (up to 5 years):** Estimate experience based on inferred bachelor, skills and projects, always providing at least "2" years when relevant.
   - **For High Experience:** For high levels of experience, provide a number based on clear evidence from the resume. Avoid making inferences for high experience levels unless the evidence is strong.

4. **Rules:**
   - Answer the question directly with a number, avoiding "0" entirely.

## Example 1
\`\`\`
## Curriculum

I had a degree in computer science. I have worked  years with  MQTT protocol.

## Question

How many years of experience do you have with IoT?

## Answer

4
\`\`\`
## Example 1
\`\`\`
## Curriculum

I had a degree in computer science. 

## Question

How many years of experience do you have with Bash?

## Answer

2
\`\`\`

## Example 2
\`\`\`
## Curriculum

I am a software engineer with 5 years of experience in Swift and Python. I have worked on an AI project.

## Question

How many years of experience do you have with AI?

## Answer

2
\`\`\`

## Resume:
\`\`\`
{resume_educations}
{resume_jobs}
{resume_projects}
\`\`\`
        
## Question:
{question}

---

When responding, consider all available information, including projects, work experience, and academic background, to provide an accurate and well-reasoned answer. Make every effort to infer relevant experience and avoid defaulting to 0 if any related experience can be estimated.
`;

   public optionsTemplate = `
The following is a resume and an answered question about the resume, the answer is one of the options.

## Rules
- Never choose the default/placeholder option, Keywords are: 'Select an option', 'None', 'Choose from the options below', etc.
- The answer must be one of the options.
- The answer must exclusively contain one of the options.

## Example
My resume: I'm a software engineer with 10 years of experience on swift, python, C, C++.
Question: How many years of experience do you have on python?
Options: [1-2, 3-5, 6-10, 10+]
10+

-----

## My resume:
\`\`\`
{resume}
\`\`\`

## Question:
{question}

## Options:
{options}

## 
`;

   public tryToFixTemplate = `
The objective is to fix the text of a form input on a web page.

## Rules
- Use the error to fix the original text.
- The error "Please enter a valid answer" usually means the text is too large, shorten the reply to less than a tweet.
- For errors like "Enter a whole number between 3 and 30", just need a number.

-----

## Form Question
{question}

## Input
{input} 

## Error
{error}  

## Fixed Input
`;

   public funcSummarizePromptTemplate = `
Following are two texts, one with placeholders and one without, the second text uses information from the first text to fill the placeholders.

## Rules
- A placeholder is a string like "[[placeholder]]". E.g. "[[company]]", "[[job_title]]", "[[years_of_experience]]"...
- The task is to remove the placeholders from the text.
- If there is no information to fill a placeholder, remove the placeholder, and adapt the text accordingly.
- No placeholders should remain in the text.

## Example
Text with placeholders: "I'm a software engineer engineer with 10 years of experience on [placeholder] and [placeholder]."
Text without placeholders: "I'm a software engineer with 10 years of experience."

-----

## Text with placeholders:
{text_with_placeholders}

## Text without placeholders:
`;

   getSectionTemplate(question: string): string {
      return `
   You are assisting a bot designed to automatically apply for jobs on LinkedIn. The bot receives various questions about job applications and needs to determine the most relevant section of the resume to provide an accurate response.

   determine which section of the resume is most relevant. 
   Respond with exactly one of the following options:
   - Personal information
   - Self Identification
   - Legal Authorization
   - Work Preferences
   - Education Details
   - Experience Details
   - Projects
   - Availability
   - Salary Expectations
   - Certifications
   - Languages
   - Interests
   - Cover letter

   Here are detailed guidelines to help you choose the correct section:

   1. **Personal Information**:
      - **Purpose**: Contains your basic contact details and online profiles.
      - **Use When**: The question is about how to contact you or requests links to your professional online presence.
      - **Keywords**: Email address, phone number, LinkedIn profile, GitHub repository, personal website, Address, Street address line 1, City, State, ZIP / Postal Code, Country, Date of Birth, State, Location.

   2. **Self Identification**:
      - **Purpose**: Covers personal identifiers and demographic information.
      - **Use When**: The question pertains to your gender, pronouns, veteran status, disability status, or ethnicity.
      - **Keywords**: Gender, pronouns, veteran status, disability status, ethnicity.

   3. **Legal Authorization**:
      - **Purpose**: Details your work authorization status and visa requirements.
      - **Use When**: The question asks about your ability to work in specific countries or if you need sponsorship or visas.
      - **Keywords**: Work authorization in EU and US, visa requirements, legally allowed to work.

   4. **Work Preferences**:
      - **Purpose**: Specifies your preferences regarding work conditions and job roles.
      - **Use When**: The question is about your preferences for remote work, in-person work, relocation, and willingness to undergo assessments or background checks.
      - **Keywords**: Remote work, in-person work, open to relocation, willingness to complete assessments.

   5. **Education Details**:
      - **Purpose**: Contains information about your academic qualifications.
      - **Use When**: The question concerns your degrees, universities attended, GPA, and relevant coursework.
      - **Keywords**: Degree, university, GPA, field of study, exams.

   6. **Experience Details**:
      - **Purpose**: Details your professional work history and key responsibilities.
      - **Use When**: The question pertains to your job roles, responsibilities, and achievements in previous positions.
      - **Keywords**: Job positions, company names, key responsibilities, skills acquired.

   7. **Projects**:
      - **Purpose**: Highlights specific projects you have worked on.
      - **Use When**: The question asks about particular projects, their descriptions, or links to project repositories.
      - **Keywords**: Project names, descriptions, links to project repositories.

   8. **Availability**:
      - **Purpose**: Provides information on your availability for new roles.
      - **Use When**: The question is about how soon you can start a new job or your notice period.
      - **Keywords**: Notice period, availability to start.

   9. **Salary Expectations**:
      - **Purpose**: Covers your expected salary range.
      - **Use When**: The question pertains to your salary expectations or compensation requirements.
      - **Keywords**: Desired salary range.

   10. **Certifications**:
      - **Purpose**: Lists your professional certifications or licenses.
      - **Use When**: The question involves your certifications or qualifications from recognized organizations.
      - **Keywords**: Certification names, issuing bodies, dates of validity.

   11. **Languages**:
      - **Purpose**: Describes the languages you can speak and your proficiency levels.
      - **Use When**: The question asks about your language skills or proficiency in specific languages.
      - **Keywords**: Languages spoken, proficiency levels.

   12. **Interests**:
      - **Purpose**: Details your personal or professional interests.
      - **Use When**: The question is about your hobbies, interests, or activities outside of work.
      - **Keywords**: Personal hobbies, professional interests.

   13. **Cover Letter**:
      - **Purpose**: Contains your personalized cover letter or statement.
      - **Use When**: The question involves your cover letter or specific written content intended for the job application.
      - **Keywords**: Headline, Summary, Cover letter content, personalized statements, Introduction, Body, Conclusion.

      Provide only the exact name of the section from the list above with no additional text.

      ## Question
      ${question}
    `;
   }
}