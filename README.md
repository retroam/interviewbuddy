# interviewbuddy

## Running the Servers

This project consists of two main components: a FastAPI server and a Next.js server. Follow the steps below to run both servers and enable communication between them.

### Prerequisites

- Ensure you have Python and Node.js installed on your system.
- Install the required Python packages by running:
  ```bash
  pip install -r requirements.txt
  ```
- Install the required Node.js packages by running:
  ```bash
  npm install
  ```

### Running the FastAPI Server

1. Navigate to the directory containing `server.py`.
2. Run the FastAPI server with the following command:
   ```bash
   uvicorn server:app --reload
   ```

### Running the Next.js Server

1. Navigate to the `app` directory.
2. Start the Next.js development server with the following command:
   ```bash
   npm run dev
   ```

### Running the Main Application

1. Navigate to the directory containing `main.py`.
2. Run the main application with the following command:
   ```bash
   python main.py dev
   ```

### Communication Between Frontend, FastAPI Server, and Main Application

- The Next.js frontend communicates with the FastAPI server (`server.py`) via HTTP requests. Ensure that the FastAPI server is running and accessible at the expected URL and port.
- The `main.py` script can communicate with the FastAPI server by making HTTP requests to its endpoints. Ensure that both are running and configured to communicate over the correct URLs and ports.
- Use environment variables to configure the URLs and ports for each service. For example, you can set `FASTAPI_URL` and `NEXTJS_URL` in a `.env` file.

### Accessing the Application

- Once both servers are running, you can access the application by navigating to `http://localhost:3000` in your web browser.

- The Next.js server will make API requests to the FastAPI server for various functionalities such as file uploads, code execution, and more.
- Ensure that both servers are running simultaneously for the application to function correctly.

### Accessing the Application

- Once both servers are running, you can access the application by navigating to `http://localhost:3000` in your web browser.
