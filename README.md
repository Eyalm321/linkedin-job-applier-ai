# LinkedIn Job Applier AI - CLI Tool

Greetings fellow job seekers,

This library was created to help you achieve stable careers faster. It is based on the original `@feder-cr/linkedIn_auto_jobs_applier_with_AI` project but has been translated to TypeScript, separated, and refined. This version includes numerous enhancements, such as:

- **Command Line Interface (CLI)**
- **Improved Logging**
- **Support for Various Scenarios**
- **Ollama API Integration**
- **Refined Prompts for ICE COLD temperature**

## Features

- **Model Selection:** Override the default model configured in your environment variables with a custom model using the `--model` or `-m` option.
- **Provider Selection:** Choose between different AI providers (OpenAI, Anthropic, Ollama) and configure the necessary API keys or base URLs.
- **Temperature Control:** Adjust the temperature setting of the AI model to control the randomness and creativity of the output.
- **Version Information:** Display the current version of the CLI tool.
- **Interactive Disclaimer:** Includes a disclaimer that users must acknowledge before proceeding with the tool.

## Installation

To install the CLI tool, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/Eyalm321/linkedin-job-applier-ai.git

2. Navigate to the project directory:
   ```bash
   cd linkedin-job-applier-ai

3. Install the necessary dependencies:
   ```bash
   npm install

Usage
To run the CLI tool, use the following command:

   ```bash
   npm run start

```
Using default settings it will automatically recognize the model based on apiKey/baseUrl.
Otherwise, you can also use the CLI to override with options:

```bash
Options
--model, -m <model>: Override the default AI model with a custom model.
--provider, -p <provider>: Specify the AI provider to use (openai, anthropic, ollama).
--apiKey, -k <key>: API key for the chosen provider (required for openai and anthropic).
--baseUrl, -b <url>: Base URL for Ollama API (required if using Ollama).
--temperature, -t <value>: Set the temperature for the AI model output.
--version, -v: Show the current version of the CLI tool.
--help, -h: Display help information and usage examples.
```

Examples
Override the OLLAMA_MODEL with myModel:
```
node cli.js --model myModel
```
Use OpenAI as the provider with a specified API key:
```
node cli.js --provider openai --apiKey your_openai_api_key
```

Use a custom Ollama base URL:
```
node cli.js --provider ollama --baseUrl http://localhost:11434
```
Set the temperature to 0.7 for more diverse output:
```
Copy code
node cli.js --temperature 0.7

```
Environment Variables
You can configure the CLI tool using the following environment variables:

```
OLLAMA_MODEL: Default AI model to use.
OPENAI_API_KEY: API key for OpenAI.
ANTHROPIC_API_KEY: API key for Anthropic.
OLLAMA_BASE_URL: Base URL for Ollama API.
TEMPERATURE: Default temperature setting for the AI model output.

```
License
This project is licensed under the MIT License. See the LICENSE file for more details.

Disclaimer
This tool automates job applications on LinkedIn. Please use it responsibly and ensure it aligns with LinkedIn's terms of service. By using this tool, you acknowledge the risks and agree to proceed at your own discretion.

Contributing
Contributions are welcome! Please submit a pull request or open an issue to discuss any changes or improvements.

Contact
For any questions or support, please open an issue on the GitHub repository.

