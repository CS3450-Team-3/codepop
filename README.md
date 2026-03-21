# Setup Instructions for CodePop

Follow these instructions to set up the CodePop project on your machine.

## Backend Setup

1. **Install Dependencies**
   - Navigate to the base directory of your project and run the following command to create the virtual environment for the backend:

     ```bash
     python -m venv codepop_virtual_enviroment
     ```

   - This will create a folder in the root directory titled `codepop_virtual_enviroment`.
   - Activate the virtual environment:

     ```bash
     # WINDOWS command using git bash
     source codepop_virtual_enviroment/Scripts/activate
     # Mac and Linux version
     source codepop_virtual_enviroment/bin/activate
     ```

   - Run the following command once the virtual environment has been activated to install dependencies:

     ```bash
     python -m pip install -r requirements.txt
     ```

   - Run the following command to confirm you have the proper dependencies installed:

     ```bash
     python -m pip list
     ```

   - your output should look like the following:

     ```bash
     Package                       Version
     ----------------------------- ---------------
     asgiref                       3.8.1
     certifi                       2024.8.30
     charset-normalizer            3.4.0
     colorama                      0.4.6
     Django                        5.1.2
     django-cors-headers           4.4.0
     djangorestframework           3.15.2
     djangorestframework_simplejwt 5.5.1
     drf-spectacular               0.29.0
     filelock                      3.16.1
     fsspec                        2024.10.0
     huggingface-hub               0.26.2
     idna                          3.10
     inflection                    0.5.1
     Jinja2                        3.1.4
     joblib                        1.4.2
     jsonschema                    4.26.0
     MarkupSafe                    3.0.2
     mpmath                        1.3.0
     networkx                      3.4.2
     numpy                         2.1.2
     packaging                     24.2
     pandas                        2.2.3
     pip                           24.0
     psycopg2                      2.9.9
     PyJWT                         2.12.1
     python-dateutil               2.9.0.post0
     pytz                          2024.2
     PyYAML                        6.0.2
     regex                         2024.11.6
     requests                      2.32.3
     safetensors                   0.4.5
     scikit-learn                  1.5.2
     scipy                         1.14.1
     sentencepiece                 0.2.0
     setuptools                    80.9.0
     six                           1.16.0
     sqlparse                      0.5.1
     stripe                        11.2.0
     sympy                         1.13.1
     threadpoolctl                 3.5.0
     tokenizers                    0.20.3
     torch                         2.5.1
     tqdm                          4.67.0
     transformers                  4.46.2
     typing_extensions             4.12.2
     tzdata                        2024.2
     uritemplate                   4.2.0
     urllib3                       2.2.3
     uuid7-standard                1.1.0
     ```

   - **Virtual Environment FAQs**
     - Please update what the expected output for the `python -m pip list` when you add new packages.

2. **Download and Install PostgreSQL**
   - Download PostgreSQL from the following link:
     [PostgreSQL Downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
   - **Important:** When installing PostgreSQL, use the following credentials:
     - **Username:** `postgres`
     - **Password:** `password`

3. **Create the Database**
   - Sign in to PostgreSQL:
     ```bash
     psql -U postgres
     ```
   - Create the database:
     ```sql
     CREATE DATABASE codepop_database;
     ```

4. **Populate Database and Start the Server**
   - Navigate to the `codepop_backend` directory.
   - Run the setup script to clean and populate the database:

     ```bash
     ./clean_database.sh
     ```

   - Start the server:

     ```bash
     python manage.py runserver
     ```

## API Documentation (Swagger/OpenAPI)

CodePop includes interactive API documentation to help with frontend development and testing. **Note: The Django backend server must be running to access these pages.**

- **[Swagger UI (Interactive Playground):](http://localhost:8000/api/schema/swagger-ui/)** `http://localhost:8000/api/schema/swagger-ui/`
  - Use this to test endpoints directly in your browser.
- **[Redoc (Technical Documentation):](http://localhost:8000/api/schema/redoc/)** `http://localhost:8000/api/schema/redoc/`
  - A clean, searchable interface for viewing API specifications.
- **[JSON Schema:](http://localhost:8000/api/schema/)** `http://localhost:8000/api/schema/`
  - The raw OpenAPI 3.0 specification.

## Frontend Setup (Next.js)

The CodePop web frontend is built using Next.js and TypeScript.

1. **Install Node.js**
   - Download and install Node.js (v18+ recommended) from [nodejs.org](https://nodejs.org/en).

2. **Start the Next.js App**
   - Navigate to the `codepop_frontend` directory.
   - Install dependencies:

     ```bash
     npm install
     ```

   - Run the development server:

     ```bash
     npm run dev
     ```

   - Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Troubleshooting

### Database State Issues

If you pull new changes and the database is in an inconsistent state:

1. Navigate to `codepop_backend`.
2. Run `./clean_database.sh`.
   **WARNING:** This will clear all data and repopulate with default values.

## Running Backend Tests

1. Navigate to `codepop_backend`.
2. Run migrations:

   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. Run tests:

   ```bash
   python manage.py test
   ```

## Basic Data (Default)

These values are populated by `clean_database.sh`:

### Users

| Username | Password | Email              | First Name  | Last Name | Role    |
| -------- | -------- | ------------------ | ----------- | --------- | ------- |
| super    | password | supertest@test.com | Lemonjello  | Smith     | Super   |
| staff    | password | staff@codepop.com  | Orlando     |           | Manager |
| test     | password | test@test.com      | Orangejello | Smith     | User    |
| test2    | password | test@testing.com   | Bob         | Bobsford  | User    |

### Featured Drinks

- **Coke Float**: Vanilla + Coke + Cream
- **Seasonal Depression**: Cinnamon, Chocolate, Pumpkin Spice, Cucumber + Rootbeer
- **I've Heard It Both Ways**: Pineapple, Bubble Gum, Cotton Candy + Dr. Pepper
- **Red Rizz**: Peach, Cranberry + Big Red
