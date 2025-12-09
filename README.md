![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)

# ChatterlyAI — Helper Socket Server (chatterlyAI-Backend1)

A lightweight Socket.IO server providing realtime messaging for the ChatterlyAI ecosystem.
A lightweight Node.js Socket.IO helper server used by the ChatterlyAI project. This repository contains a focused, single-purpose realtime socket server (socket-server.js) intended to be used as a helper/service — either deployed (e.g., Render) or run locally.

This README is intentionally minimal and practical — this repo is a helper microservice, not a full standalone application.

## What this repo contains
- socket-server.js — the single-server entry point (run with `node socket-server.js`)
- lib/database.js — MongoDB connection helper used by socket-server.js
- package.json / package-lock.json — dependencies (Express, Socket.IO, dotenv, axios, socket.io-client)
- .gitignore

Helper socket server with database integration.

## Environment Variables
Create a `.env` file in the root of the project with the following keys:

MONGO_URI=<your_mongodb_connection_string>
MONGO_DB=<your_database_name>
The `MONGO_URI` and `MONGO_DB` value is loaded inside `lib/database.js` to establish the database connection.
Make sure to never commit your `.env` file to version control.

## Requirements
- Node.js (recommended v16+ or a current LTS)
- npm (or yarn)

## Quickstart — local
```git clone https://github.com/rishugoyal805/chatterlyAI-Backend1.git
cd chatterly-backend
npm install
node socket-server.js
```

Make sure to configure CORS if running locally to avoid socket connection issues.

The server will start. If you deploy on Render, set the start command to:
   node socket-server.js

## Deployment
- Render: Create a new Web Service, connect this repository, set the start command to `node socket-server.js`.
- Any other host: Use the same start command appropriate for your host.

## Runtime & Behavior
This repository acts purely as a realtime socket server. It is meant to be used as a helper service integrated into the main Chatterly application ecosystem. It does not include a database layer or persistent storage — its responsibility is realtime messaging and socket management.

## Dependencies
Primary dependencies shown in package.json:
- axios
- dotenv
- express
- socket.io
- socket.io-client

(Exact versions are in package-lock.json.)

## Conventions
- Run with `node socket-server.js`

## Contributing
Contributions are welcome! Feel free to submit bug fixes, improvements, or suggestions via issues or pull requests.

## License
This project is licensed under the CC BY-NC 4.0 License.
You may use, modify, and share it for non-commercial purposes with attribution.

## Maintainer
rishugoyal805 | rishugoyal16800@gmail.com
