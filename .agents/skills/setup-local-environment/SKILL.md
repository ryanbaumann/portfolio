---
name: setup-local-environment
description: Automatically helps the user configure their local environment by running the setup wizard to generate the required .env file and prompting them to find missing API credentials.
---

# Setup Local Environment

## Use When
- The user is trying to run the project locally for the first time.
- The user complains about missing API keys, Strava client ID issues, or maps not loading in local development.
- The user asks to "setup the environment" or "configure secrets".

## Inputs Needed
- None explicitly. The agent will run the setup command and ask the user for required credentials as needed.

## Steps
1. Run `find . -name ".env"` to see if a root `.env` file exists. If it exists, ask the user if they want to overwrite it before proceeding.
2. Tell the user you are going to run the interactive setup wizard.
3. Because interactive CLI scripts (`stdin` prompts) block automated test agents, do **NOT** run `npm run setup` in the background via `run_command`.
4. Instead, use the `run_command` tool to read the `.env.template` file: `cat .env.template`.
5. Guide the user to find the keys based on the template:
   - Strava keys: https://www.strava.com/settings/api
   - Google Maps keys: GCP Cloud Console -> Credentials
   - Gemini server key: Google AI Studio or the approved Google Cloud project.
6. Never ask the user to paste secret values into chat or place them in tool-call arguments/logs. Have the user enter them directly through `npm run setup` or edit the ignored root `.env` locally.
7. Verify only that required variable names are non-empty; never print values. Treat `GEMINI_API_KEY`, `STRAVA_CLIENT_SECRET`, `GMP_SERVER_API_KEY`, tokens, and passwords as server-only.
8. Remind the user they must restart the local server (`npm run build && npm start`) if it was already running.

## Verification
- Run `npm run build` to ensure Vite successfully detects and injects the `VITE_` prefixed variables without errors.
- Confirm served assets contain only intended browser keys and do not contain server keys or client secrets; report booleans/counts, not values.

## Output
- Confirm to the user that the `.env` file was successfully written and all applications are ready for local testing.

## Maintenance Notes
- If new third-party APIs are added to the gateway, update `.env.template`, `scripts/setup.mjs`, and this skill file to capture the new key.
