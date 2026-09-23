## Project Intent (for AI Agents)

This repository contains a Node.js + Express API that is intended to be deployed on Vercel as a serverless backend. The goal is for the API to behave like a normal server from the client's perspective (e.g., Flutter, Next.js, mobile apps), but under the hood it runs on Vercel Functions.

## Key Constraints

- The API must be compatible with Vercel's serverless execution model.
- The entry point for Vercel should export a request handler, not start a traditional Node.js server with listen().
- All routes and middleware should be defined using Express as usual; only the way the app is "started" changes for Vercel.

## Deployment Target

- Platform: Vercel
- Runtime: Node.js serverless functions
- All API endpoints should be accessible via the deployed Vercel URL (e.g., https://your-project.vercel.app/...).

## Development vs Production

- Local development can use a convenient setup (e.g., with nodemon), but the file used by Vercel as the main entry must remain compatible with serverless (handler export, no listen()).
- Production on Vercel must treat the function as stateless; any persistent data should be stored in a database or external service, not in memory.

## Expectations for AI Agents

When assisting with this project, AI coding agents should:

- Assume the final deployment environment is Vercel serverless, not a long-running Node server.
- Prefer patterns and structures that are compatible with Vercel Functions.
- Avoid introducing patterns that require long-lived connections, in-memory global state for important data, or traditional server startup logic in the Vercel entry file.
- Focus on building clear, maintainable API routes and controllers that can be easily deployed and scaled on Vercel.