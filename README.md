# KitchenStock - StockWatch POC

The restaurant **"For You"** in Ifrane faces difficulties maintaining accurate inventory updates and finding proper supplier contact times to prevent stock depletion. The restaurant-specific application **KitchenStock** aims to address inventory management needs of this industry.

This is a **Proof-of-Concept (POC)** application for a simple inventory management system, built for a database class project. It demonstrates basic CRUD functionality across related database tables.

## Tech Stack

- **Frontend:** React + MUI (Material UI)  
- **Backend:** Node.js + Express.js  
- **Database:** PostgreSQL

## Prerequisites

Ensure the following are installed:

- **Node.js** (includes npm): [https://nodejs.org/](https://nodejs.org/)  
- **PostgreSQL**: [https://www.postgresql.org/download/](https://www.postgresql.org/download/)  
- **pgAdmin** (recommended): [https://www.pgadmin.org/](https://www.pgadmin.org/)  
- **Git**: [https://git-scm.com/](https://git-scm.com/)

## Project Structure

```
stockwatch/  # Or kitchenstock/
├── backend/         # Node.js/Express API
│   ├── node_modules/
│   ├── src/
│   ├── .env         # DB credentials, Port — !! DO NOT COMMIT !!
│   ├── .gitignore
│   └── package.json
└── frontend/        # React/MUI UI
    ├── node_modules/
    ├── public/
    ├── src/
    ├── .env         # API URL — !! DO NOT COMMIT !!
    ├── .gitignore
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Setup Instructions

### 1. Clone the Repository

If hosted remotely (e.g., GitHub):

```bash
git clone https://github.com/linaoudghiri203/kitchenstock.git
cd kitchenstock  # Or stockwatch/
```

Ensure both `backend/` and `frontend/` are in the main project directory.

---

### 2. Backend Setup (Node.js API)

Navigate to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create the environment configuration file `.env` in `backend/`:

```env
# backend/.env

# PostgreSQL Database Connection Details
DB_USER=your_postgres_user
DB_HOST=localhost
DB_DATABASE=stockwatch_poc
DB_PASSWORD=your_postgres_password  # Leave blank if using trust auth
DB_PORT=5432

# Server Port
PORT=5001
```

Set up PostgreSQL:

- Ensure PostgreSQL is running.
- Create a DB called `stockwatch_poc` via `psql` or pgAdmin.
- Run the provided `postgres_schema_poc.sql` script.

Start the backend server:

```bash
# For development (auto-reload)
npm run dev

# Or standard start
npm start
```

The API should run at `http://localhost:5001`. Test with `http://localhost:5001/db-test`.

---

### 3. Frontend Setup (React App)

Navigate to frontend:

```bash
cd ../frontend
```

Install dependencies:

```bash
npm install
```

Create the `.env` file in `frontend/`:

```env
# frontend/.env
VITE_API_BASE_URL=http://localhost:5001/api
```

Start the development server:

```bash
npm run dev
```

Vite will output a URL (e.g., `http://localhost:5173`). Open it in your browser.

---

## Running the Application

1. Start backend:

   ```bash
   cd backend && npm run dev
   ```

2. Start frontend:

   ```bash
   cd ../frontend && npm run dev
   ```

3. Open the frontend URL (usually `http://localhost:5173`) in your browser.

The React app communicates with the Node.js backend to manage inventory data.
