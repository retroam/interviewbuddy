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
   python server.py
   ```

### Running the Next.js Server

1. Navigate to the `app` directory.
2. Start the Next.js development server with the following command:
   ```bash
   npm run dev
   ```

### Communication Between Servers

- The Next.js server will make API requests to the FastAPI server for various functionalities such as file uploads, code execution, and more.
- Ensure that both servers are running simultaneously for the application to function correctly.

### Accessing the Application

- Once both servers are running, you can access the application by navigating to `http://localhost:3000` in your web browser.
