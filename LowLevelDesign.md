# Low-Level Design Document

**Version:** 1

**Team:** SocialDrinkers

---

Table of contents:

- [Low-Level Design Document](#low-level-design-document)
  - [1. Introduction and Architectural Overview](#1-introduction-and-architectural-overview)
    - [1.1 Purpose](#11-purpose)
    - [1.2 Consistency with High-Level Design](#12-consistency-with-high-level-design)
    - [1.3 System Architecture](#13-system-architecture)
  - [2. Technology Stack \& Frameworks](#2-technology-stack--frameworks)
    - [2.1 Languages, Libraries, and Frameworks](#21-languages-libraries-and-frameworks)
    - [2.2 Justification](#22-justification)
  - [3. Subsystem and Class Design](#3-subsystem-and-class-design)
    - [3.1 Subsystem Breakdown](#31-subsystem-breakdown)
    - [3.2 Detailed Class Definitions](#32-detailed-class-definitions)
    - [3.3 UML Class Diagrams](#33-uml-class-diagrams)
  - [4. Database Design](#4-database-design)
    - [4.1 Database Tables and Schema](#41-database-tables-and-schema)
      - [**Table: `preference`**](#table-preference)
      - [**Table: `drink`**](#table-drink)
      - [**Table: `drink_favorite`** (Many-to-Many Join Table)](#table-drink_favorite-many-to-many-join-table)
      - [**Table: `inventory`**](#table-inventory)
      - [**Table: `notification`**](#table-notification)
      - [**Table: `order`**](#table-order)
      - [**Table: `order_drinks`** (Many-to-Many Join Table)](#table-order_drinks-many-to-many-join-table)
      - [**Table: `revenue`**](#table-revenue)
      - [Implementation Notes](#implementation-notes)
    - [4.2 Normalization Justification](#42-normalization-justification)
      - [**First Normal Form (1NF):** Eliminating Repeating Groups](#first-normal-form-1nf-eliminating-repeating-groups)
      - [**Second Normal Form (2NF):** Eliminating Partial Dependencies](#second-normal-form-2nf-eliminating-partial-dependencies)
      - [**Third Normal Form (3NF):** Eliminating Transitive Dependencies](#third-normal-form-3nf-eliminating-transitive-dependencies)
  - [5. User Interface (UI) and Experience (UX)](#5-user-interface-ui-and-experience-ux)
    - [5.1 UI Prototypes](#51-ui-prototypes)
    - [5.2 User Flow](#52-user-flow)
    - [5.3 Usability and Accessibility](#53-usability-and-accessibility)
  - [6. System Performance and Scalability](#6-system-performance-and-scalability)
    - [6.1 Performance Bottlenecks](#61-performance-bottlenecks)
    - [6.2 Load Handling](#62-load-handling)
  - [7. Security and Data Protection](#7-security-and-data-protection)
    - [7.1 Security Risks \& Mitigations](#71-security-risks--mitigations)
    - [7.2 Data Protection (In Transit and At Rest)](#72-data-protection-in-transit-and-at-rest)
  - [8. Third-Party Integrations](#8-third-party-integrations)
    - [8.1 Integration Details](#81-integration-details)
  - [9. Deployment Plan and DevOps](#9-deployment-plan-and-devops)
    - [9.1 Deployment Strategy](#91-deployment-strategy)
    - [9.2 Automated Testing and Monitoring](#92-automated-testing-and-monitoring)
  - [10. Task Breakdown and Team Assignments](#10-task-breakdown-and-team-assignments)
    - [10.1 Key Tasks and Feature Teams](#101-key-tasks-and-feature-teams)

---

## 1. Introduction and Architectural Overview

### 1.1 Purpose

The purpose of this document is to provide a detailed, technical blueprint for the CodePop system. It outlines the specific classes, database schemas, security protocols, and deployment strategies necessary for the development sprints.

### 1.2 Consistency with High-Level Design

[_Describe how this low-level design builds upon and remains consistent with the high-level architecture outlined in the High-Level Design document._]

### 1.3 System Architecture

[_Provide a clear and concise description of the overall system architecture (e.g., Client-Server architecture utilizing a ReactJS mobile frontend and a Django REST API backend)._]

---

## 2. Technology Stack & Frameworks

### 2.1 Languages, Libraries, and Frameworks

- **Frontend:** ReactJS
- **Backend:** Django (Python)
- **Database:** PostgreSQL
- **Other Tools:** Stripe (payment processor)

### 2.2 Justification

- **Design Choice:** [e.g. Utilizing ReactJS for frontend and Django for backend.]
- **Alternatives Considered:** [e.g. Native iOS (Swift) / Android (Kotlin) for frontend, Node.js/Express for backend.]
- **Rationale:** [e.g. ReactJS allows for cross-platform deployment with a single codebase, fitting project time constraints. Django provides a robust, out-of-the-box ORM, admin panel, and secure authentication handling, maximizing long-term maintainability.]

---

## 3. Subsystem and Class Design

### 3.1 Subsystem Breakdown

[_Identify major subsystems here (e.g., User Authentication, Order Management, Catalog/Menu Management, AI Drink Recommendation)._]

### 3.2 Detailed Class Definitions

[_Break down each subsystem into specific classes. Explain how they adhere to the Single Responsibility Principle (SRP). Ensure you describe how inheritance is used appropriately to avoid complexity, and where composition is used to make objects work together._]

**Subsystem 1: [Name]**

- `ClassName1`: Description of responsibility.
  - _Fields:_ `field1 (type)`, `field2 (type)`
  - _Methods:_ `method1()`, `method2()`
- `ClassName2`: Description of responsibility.

_(Repeat for other subsystems)_

### 3.3 UML Class Diagrams

[_Insert your detailed UML class diagrams here. Ensure they outline class names, fields, methods, and relationships (inheritance, composition, aggregation)._]

![Backend UML Diagram](path/to/Backend_UML_Diagram.png)
_(Ensure the diagram is updated and legible)_

---

## 4. Database Design

### 4.1 Database Tables and Schema

[_Define database tables, including column names, data types, and foreign key relationships._]

#### **Table: `preference`**

Stores user-specific app or drink preferences.

| PreferenceID  | UserID                | Preference                               |
| :------------ | :-------------------- | :--------------------------------------- |
| `primary_key` | `id` from `auth_user` | String with user preferences (max `100`) |

---

#### **Table: `drink`**

Stores the recipes and metadata for custom sodas, whether they are standard menu items or created by a user.

| DrinkID       | Name               | SyrupsUsed       | SodaUsed         | AddIns           | Rating           | Price | Size                 | Ice                       | User_Created |
| :------------ | :----------------- | :--------------- | :--------------- | :--------------- | :--------------- | :---- | :------------------- | :------------------------ | :----------- |
| `primary_key` | String (max `255`) | Array of Strings | Array of Strings | Array of Strings | Float (nullable) | Float | String (default `m`) | String (default `normal`) | Boolean      |

---

#### **Table: `drink_favorite`** (Many-to-Many Join Table)

Automatically generated by Django to handle the `ManyToManyField` for users favoriting specific drinks.

| id            | drink_id               | user_id               |
| :------------ | :--------------------- | :-------------------- |
| `primary_key` | `DrinkID` from `drink` | `id` from `auth_user` |

---

#### **Table: `inventory`**

Tracks the physical stock of the soda shop, including bases, syrups, add-ins, and cups/lids.

| InventoryID   | ItemName           | ItemType                               | Quantity         | ThresholdLevel   | LastUpdated             |
| :------------ | :----------------- | :------------------------------------- | :--------------- | :--------------- | :---------------------- |
| `primary_key` | String (max `100`) | String (Soda, Syrup, Add In, Physical) | Positive Integer | Positive Integer | DateTime (Auto-updated) |

---

#### **Table: `notification`**

Stores alerts and messages to be sent to users (e.g., when their soda is ready in the locker).

| NotificationID | UserID                | Message            | Timestamp              | Type              | Global                  |
| :------------- | :-------------------- | :----------------- | :--------------------- | :---------------- | :---------------------- |
| `primary_key`  | `id` from `auth_user` | String (max `500`) | DateTime (default now) | String (max `50`) | Boolean (default False) |

---

#### **Table: `order`**

Manages customer orders, their payment statuses, and fulfillment details (like locker combinations).

| OrderID       | UserID                           | OrderStatus                                        | PaymentStatus                          | PickupTime          | CreationTime        | LockerCombo           | StripeID |
| :------------ | :------------------------------- | :------------------------------------------------- | :------------------------------------- | :------------------ | :------------------ | :-------------------- | :------- |
| `primary_key` | `id` from `auth_user` (nullable) | String (Pending, Processing, Completed, Cancelled) | String (Pending, Paid, Failed, Remade) | DateTime (nullable) | DateTime (Auto-add) | BigInteger (nullable) | String   |

---

#### **Table: `order_drinks`** (Many-to-Many Join Table)

Automatically generated by Django to handle the `ManyToManyField` linking multiple drinks to a single order.

| id            | order_id               | drink_id               |
| :------------ | :--------------------- | :--------------------- |
| `primary_key` | `OrderID` from `order` | `DrinkID` from `drink` |

---

#### **Table: `revenue`**

Tracks accounting and financial metrics associated with orders. _(Note: `OrderID` here is strictly an Integer field rather than a hard Foreign Key, based on your model)._

| RevenueID     | OrderID                      | TotalAmount           | SaleDate                 | Refunded                  |
| :------------ | :--------------------------- | :-------------------- | :----------------------- | :------------------------ |
| `primary_key` | Integer (References `order`) | Float (default `0.0`) | DateTime (default `now`) | Boolean (default `False`) |

---

#### Implementation Notes

- **Foreign Keys**: In the actual PostgreSQL database, Django will append `_id` to the Foreign Key fields. For example, the `UserID` field in the `Preference` model will be created as `UserID_id` in the database to link to the `auth_user` table.
- **Arrays**: Because we're using `ArrayField` for `SyrupsUsed`, `SodaUsed`, and `AddIns`, these will be native PostgreSQL array types (ideal for scalable recipe ingredients).

### 4.2 Normalization Justification

To ensure data integrity, minimize redundancy, and prevent anomalies (from `insert`, `update`, `delete`, etc.), the CodePop database is designed to adhere to at least the Third Normal Form (3NF).

Below is a breakdown of how these tables satisfy these rules:

#### **First Normal Form (1NF):** Eliminating Repeating Groups

1NF requires that the tables contain no repeating groups or multi-valued attributes, ensuring each column contains solely atomic values.

- **How we achieve it:** In our models, we use Django's `ManyToMany` field for relationships where multiple items can belong to multiple entities. Specifically, `Favorite` (users favoring drinks) and `Drinks` (drinks in an order). Instead of storing a comma-separated string of DrinkIDs in the `order` table, the ORM manages the mapping tables. This separates the data into distinct, atomic rows.
- **Notes on ArrayFields:** We utilize PostgreSQL `ArrayField` for `SyrupsUsed`, `SodaUsed`, and `AddIns` in the `Drink` model. While traditional theory considers this a violation of 1NF, this is a deliberate, modern optimization choice. Because these ingredients are strictly descriptive to the recipe, and don't require foreign-key tracking to an ingredients table, this prevents excessive and expensive SQL joins while maintaining application logic.

#### **Second Normal Form (2NF):** Eliminating Partial Dependencies

2NF further requires that all non-key attributes are fully functionally dependent on the entire primary key.

- **How we achieve it:** Partial dependencies can only occur in tables with composite primary keys (a primary key made of two or more columns). Because every standard model in our schema (`Preference`, `Drink`, `Inventory`, `Notification`, `Order`, `Revenue`) relies on a _single-column_, _auto-incrementing_ integer as its Primary Key (e.g., `PreferenceID`, `DrinkID`), partial dependency is structurally impossible. Every attribute in these tables depends entirely on that single ID.

#### **Third Normal Form (3NF):** Eliminating Transitive Dependencies

3NF further requires that no non-key attribute depends on another non-key attribute. All attributes must depend solely on the primary key.

- **How we achieve it:** We heavily utilize Foreign Keys to reference related data rather than duplicating it. For example, in the `Order` table, we store a `UserID` (Foreign Key) rather than storing the user's username, email, or phone number directly on the order record.
- **Preventing Anomalies:** If a user's account details were stored directly in the `Order` table, changing a user's email address would require updating every single order that user has ever made (Update Anomaly). If we deleted a user's only order, we might accidentally delete the user's account information (Deletion Anomaly). By strictly storing only the `UserID` in the `Order` table, the user's data depends strictly on the `id` in the `auth_user` table, completely satisfying 3NF. Similarly, the `Revenue` table calculates and stores financial data linked to an `OrderID`, isolating financial tracking from the logistical status of the Order itself.

---

## 5. User Interface (UI) and Experience (UX)

### 5.1 UI Prototypes

A working prototype for the application can be found [here](https://www.figma.com/make/BtypY8RxTDdqVOn2As0ygv/CodePop).

[_Insert prototypes for all user types (Admin, Manager, End User)._]

- ![Home Screen](path/to/1_Home_Screen.png)
- ![Drink Order Screen](path/to/2_Drink_Order_Screen.png)

### 5.2 User Flow

[_Describe the user flow for key interactions (e.g., How a customer creates a custom drink, adds it to the cart, and checks out)._]

### 5.3 Usability and Accessibility

[_Explain how the interface supports usability and accessibility (e.g., high color contrast, intuitive navigation, clear error messages, and scalable fonts)._]

---

## 6. System Performance and Scalability

### 6.1 Performance Bottlenecks

[_Identify potential bottlenecks (e.g., complex AI recommendation generation, large database queries during peak ordering hours)._]

### 6.2 Load Handling

[_Answer: "How will the system handle an increase in load?" (e.g., Implement database indexing on frequently queried columns, use query optimization in Django ORM, or utilize caching for the static drink catalog)._]

---

## 7. Security and Data Protection

### 7.1 Security Risks & Mitigations

There are various common security risks potentially involved in the development of this application if proper standards are not followed:

- **Risk: Mitigation**
  - **Notes**
- **SQL Injection:** Prevented by Django's Object-based (ORM) implementation of SQL commands, treating all user inputs purely as text.
  - `eval()` is a very dangerous function (**DO NOT USE**)
- **Cross-site Scripting (XSS):** React by default treats all rendered variables as pure text, instead of just putting it into the webpage. This prevents instances where if a malicious username is rendered, even if there is code by way of `<script>` tags, these are not executed on the user's machine.
  - Note the dangers of using `dangerouslySetInnerHTML` in React. (**DO NOT USE**)
- **CSRF:** Prevented by using Django's `CSRF Token` checks during state-changing requests (e.g. `POST`, `PUT`, `DELETE`). Only valid, active sessions have a usable `CSRF token`, preventing random websites from sending requests to the database.

### 7.2 Data Protection (In Transit and At Rest)

- **In Transit:** All communications between the ReactJS app and Django backend will be encrypted using HTTPS/TLS.
- **At Rest:** Sensitive user data (like passwords) will not be stored in plaintext. Django’s default PBKDF2 password hasher will be used. Payment information is solely handled by Stripe.

---

## 8. Third-Party Integrations

### 8.1 Integration Details

_Thoroughly explain integrations with third-party systems._

- **Payments:** Stripe will be used as the payment processor. Following the information in the [Stripe Developer Documentation](https://docs.stripe.com/), we will ensure that the implementation is as secure as possible, and that the user's card information is safely handled.
- **AI Integration:** [_(e.g., OpenAI API for drink recommendations - explain how the prompt is constructed and how the response is parsed)._]
- **Mapping/Location:** [_(If utilizing Google Maps or similar for the 'Map' component)._]

---

## 9. Deployment Plan and DevOps

### 9.1 Deployment Strategy

[_Outline the system's deployment plan (e.g., Heroku, AWS EC2, or PythonAnywhere for the backend; ReactJS + PWA for the frontend)._]

### 9.2 Automated Testing and Monitoring

- **Testing:** [Detail the automated testing setup (e.g., Django unit tests `tests.py` for API endpoints and models).]
- **Monitoring:** [Explain how you will monitor for crashes or errors (e.g., Django logging, Expo error reporting).]

---

## 10. Task Breakdown and Team Assignments

### 10.1 Key Tasks and Feature Teams

[_Identify, prioritize, and assign key tasks required to implement each subsystem._]

| Priority | Task Description                           | Subsystem | Assigned Team   |
| :------- | :----------------------------------------- | :-------- | :-------------- |
| High     | Set up Django Models and migrate database  | Database  | Back-end Team   |
| High     | Implement JWT / Session Authentication API | Auth      | Back-end Team   |
| High     | Build Home and Order UI components         | UI        | Front-end Team  |
| Medium   | Integrate AI Recommendation script         | AI        | Back-end Team   |
| Medium   | Connect Cart UI to backend API             | Order Mgt | Front-end Team  |
| Low      | Configure deployment server                | DevOps    | Network/Backend |
