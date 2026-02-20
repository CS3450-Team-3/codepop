# Low-Level Design Document

**Version:** 1

**Team:** SocialDrinkers

---

## 1. Introduction and Architectural Overview

### 1.1 Purpose

The purpose of this document is to provide a detailed, technical blueprint for the CodePop system. It outlines the specific classes, database schemas, security protocols, and deployment strategies necessary for the development sprints.

### 1.2 Consistency with High-Level Design

_Describe how this low-level design builds upon and remains consistent with the high-level architecture outlined in the High-Level Design document._

### 1.3 System Architecture

_Provide a clear and concise description of the overall system architecture (e.g., Client-Server architecture utilizing a React Native mobile frontend and a Django REST API backend)._

---

## 2. Technology Stack & Frameworks

### 2.1 Languages, Libraries, and Frameworks

- **Frontend:** React Native, Expo, JavaScript/JSX
- **Backend:** Python, Django, Django REST Framework
- **Database:** SQLite / PostgreSQL _(Specify which one)_
- **Other Tools:** _(e.g., Node.js, external APIs)_

### 2.2 Justification

- **Design Choice:** Utilizing React Native for frontend and Django for backend.
- **Alternatives Considered:** Native iOS (Swift) / Android (Kotlin) for frontend, Node.js/Express for backend.
- **Rationale:** React Native allows for cross-platform deployment with a single codebase, fitting project time constraints. Django provides a robust, out-of-the-box ORM, admin panel, and secure authentication handling, maximizing long-term maintainability.

---

## 3. Subsystem and Class Design

### 3.1 Subsystem Breakdown

_Identify major subsystems here (e.g., User Authentication, Order Management, Catalog/Menu Management, AI Drink Recommendation)._

### 3.2 Detailed Class Definitions

_Break down each subsystem into specific classes. Explain how they adhere to the Single Responsibility Principle (SRP). Ensure you describe how inheritance is used appropriately to avoid complexity, and where composition is used to make objects work together._

**Subsystem 1: [Name]**

- `ClassName1`: Description of responsibility.
  - _Fields:_ `field1 (type)`, `field2 (type)`
  - _Methods:_ `method1()`, `method2()`
- `ClassName2`: Description of responsibility.

_(Repeat for other subsystems)_

### 3.3 UML Class Diagrams

_Insert your detailed UML class diagrams here. Ensure they outline class names, fields, methods, and relationships (inheritance, composition, aggregation)._

![Backend UML Diagram](path/to/Backend_UML_Diagram.png)
_(Ensure the diagram is updated and legible)_

---

## 4. Database Design

### 4.1 Database Tables and Schema

_Define database tables, including column names, data types, and foreign key relationships._

**Table: `Users`**

- `id` (Primary Key, Integer)
- `username` (String, Unique)
- `password_hash` (String)

**Table: `Sodas`**

- `id` (Primary Key, Integer)
- `name` (String)
- `price` (Decimal)

**Table: `Orders`**

- `id` (Primary Key, Integer)
- `user_id` (Foreign Key -> Users.id)
- `total_price` (Decimal)

_(Add remaining tables such as AddIns, Syrups, OrderItems, etc.)_

### 4.2 Normalization Justification

_Explain how the tables are normalized to at least the Third Normal Form (3NF). For example, explain how removing repeating groups and ensuring all attributes depend solely on the primary key prevents data anomalies._

---

## 5. User Interface (UI) and Experience (UX)

### 5.1 UI Prototypes

_Insert prototypes for all user types (Admin, Manager, End User)._

- ![Home Screen](path/to/1_Home_Screen.png)
- ![Drink Order Screen](path/to/2_Drink_Order_Screen.png)

### 5.2 User Flow

_Describe the user flow for key interactions (e.g., How a customer creates a custom drink, adds it to the cart, and checks out)._

### 5.3 Usability and Accessibility

_Explain how the interface supports usability and accessibility (e.g., high color contrast, intuitive navigation, clear error messages, and scalable fonts)._

---

## 6. System Performance and Scalability

### 6.1 Performance Bottlenecks

_Identify potential bottlenecks (e.g., complex AI recommendation generation, large database queries during peak ordering hours)._

### 6.2 Load Handling

_Answer: "How will the system handle an increase in load?" (e.g., Implement database indexing on frequently queried columns, use query optimization in Django ORM, or utilize caching for the static drink catalog)._

---

## 7. Security and Data Protection

### 7.1 Security Risks & Mitigations

_Identify potential security risks and outline mitigating strategies._

- **Risk:** SQL Injection
  - **Mitigation:** Django’s ORM automatically escapes parameters, preventing direct SQL injection.
- **Risk:** Cross-Site Request Forgery (CSRF) / Cross-Site Scripting (XSS)
  - **Mitigation:** Django provides built-in CSRF tokens and automatic HTML escaping in templates/responses.

### 7.2 Data Protection (In Transit and At Rest)

- **In Transit:** All communications between the React Native app and Django backend will be encrypted using HTTPS/TLS.
- **At Rest:** Sensitive user data (like passwords) will not be stored in plaintext. Django’s default PBKDF2 password hasher will be used. _Mention how payment data is handled if stored, or clarify if it is offloaded to a secure third party._

---

## 8. Third-Party Integrations

### 8.1 Integration Details

_Thoroughly explain integrations with third-party systems._

- **AI Integration:** _(e.g., OpenAI API for drink recommendations - explain how the prompt is constructed and how the response is parsed)._
- **Mapping/Location:** _(If utilizing Google Maps or similar for the 'Map' component)._
- **Payments:** _(If integrating Stripe, PayPal, etc., explain the webhook/token process)._

---

## 9. Deployment Plan and DevOps

### 9.1 Deployment Strategy

_Outline the system's deployment plan (e.g., Heroku, AWS EC2, or PythonAnywhere for the backend; Expo Go/App Stores for the frontend)._

### 9.2 Automated Testing and Monitoring

- **Testing:** Detail the automated testing setup (e.g., Django unit tests `tests.py` for API endpoints and models).
- **Monitoring:** Explain how you will monitor for crashes or errors (e.g., Django logging, Expo error reporting).

---

## 10. Task Breakdown and Team Assignments

### 10.1 Key Tasks and Feature Teams

_Identify, prioritize, and assign key tasks required to implement each subsystem._

| Priority | Task Description                           | Subsystem | Assigned Team   |
| :------- | :----------------------------------------- | :-------- | :-------------- |
| High     | Set up Django Models and migrate database  | Database  | Back-end Team   |
| High     | Implement JWT / Session Authentication API | Auth      | Back-end Team   |
| High     | Build Home and Order UI components         | UI        | Front-end Team  |
| Medium   | Integrate AI Recommendation script         | AI        | Back-end Team   |
| Medium   | Connect Cart UI to backend API             | Order Mgt | Front-end Team  |
| Low      | Configure deployment server                | DevOps    | Network/Backend |
