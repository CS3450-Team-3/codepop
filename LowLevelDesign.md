# Low-Level Design Document

**Version:** 1

**Team:** SocialDrinkers (3)

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
      - [**Table: `Flavors`**](#table-flavors)
      - [**Table: `drink_favorite`** (Many-to-Many Join Table)](#table-drink_favorite-many-to-many-join-table)
      - [**Table: `inventory`**](#table-inventory)
      - [**Table: `notification`**](#table-notification)
      - [**Table: `order`**](#table-order)
      - [**Table: `order_drinks`** (Many-to-Many Join Table)](#table-order_drinks-many-to-many-join-table)
      - [**Table: `revenue`**](#table-revenue)
      - [**Table: `USER_Home_Server`** (Many-to-Many Join Table)](#table-user_home_server-many-to-many-join-table)
      - [Implementation Notes](#implementation-notes)
    - [4.2 Normalization Justification](#42-normalization-justification)
      - [**First Normal Form (1NF):** Eliminating Repeating Groups](#first-normal-form-1nf-eliminating-repeating-groups)
      - [**Second Normal Form (2NF):** Eliminating Partial Dependencies](#second-normal-form-2nf-eliminating-partial-dependencies)
      - [**Third Normal Form (3NF):** Eliminating Transitive Dependencies](#third-normal-form-3nf-eliminating-transitive-dependencies)
  - [5. User Interface (UI) and Experience (UX)](#5-user-interface-ui-and-experience-ux)
    - [5.1 UI Prototypes](#51-ui-prototypes)
    - [5.2 User Flow](#52-user-flow)
    - [5.3 Usability and Accessibility](#53-usability-and-accessibility)
  - [6. Peer to Peer Networking](#6-peer-to-peer-networking)
    - [6.0 Terms](#60-terms)
      - [Home Server](#home-server)
      - [Visiting Server](#visiting-server)
      - [Sensitive Information](#sensitive-information)
      - [Permanent Data](#permanent-data)
      - [Ephemeral Data](#ephemeral-data)
      - [Inter-Server API](#inter-server-api)
    - [6.1 Home and Visiting Server Assignment](#61-home-and-visiting-server-assignment)
      - [Single-Region Users](#single-region-users)
      - [Multi-Region Users](#multi-region-users)
    - [6.2 Cross-Server User Session Handling](#62-cross-server-user-session-handling)
      - [Account Creation](#account-creation)
      - [Login Process](#login-process)
      - [Data Transfer Rules](#data-transfer-rules)
      - [Payment and Order Processing](#payment-and-order-processing)
      - [The visiting server never handles raw payment data.](#the-visiting-server-never-handles-raw-payment-data)
    - [6.3 Data Synchronization and API Optimization](#63-data-synchronization-and-api-optimization)
      - [Login Discovery Process](#login-discovery-process)
      - [User Table Updates](#user-table-updates)
      - [Caching Strategy](#caching-strategy)
    - [6.4 Security Requirements for Peer-to-Peer Servers](#64-security-requirements-for-peer-to-peer-servers)
    - [6.5 Server Failure and Fault Tolerance](#65-server-failure-and-fault-tolerance)
    - [6.6 Scalability and Load Balancing](#66-scalability-and-load-balancing)
    - [6.7 Data Privacy Model](#67-data-privacy-model)
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

The Low-Level Design remains fully consistent with the High-Level Design by preserving the defined three-tier architecture, maintaining clear separation between the client, server, and database layers.

This document adheres strictly to the technology stack selected in the HLD, utilizing ReactJS for the frontend, Django for the backend, PostgreSQL for the database, and Stripe for payment processing. The LLD does not introduce new architectural technologies or structural deviations; rather, it implements and refines the design decisions established in the HLD.

Security considerations outlined in the HLD are expanded upon in this document through detailed implementation strategies. This includes enforced data encryption in transit, hashed password storage using Django’s secure defaults, centralized storage of sensitive data on authoritative servers, and adherence to OWASP Top 10 security principles.

The decentralized peer-to-peer architecture described in the HLD is further operationalized in the LLD through the formal definition of Home and Visiting servers. This includes clearly defined server roles, authentication workflows, data ownership rules, synchronization policies, and fault tolerance mechanisms. These refinements ensure secure and efficient inter-server communication while preserving the original decentralized vision.

Additionally, the LLD supports the HLD’s goals regarding inventory tracking, predictive maintenance, and IoT telemetry by defining the Inventory table, Notification system, order and telemetry logging structures, and scalable REST-based device communication endpoints.

Overall, the Low-Level Design does not deviate from the High-Level Design. Instead, it provides detailed technical implementations that reinforce and expand upon the architectural decisions previously established.

### 1.3 System Architecture

Each client is implemented as a ReactJS Progressive Web App. It is responsible for rendering the user interface, handling user input, and securely communicating with backend services over HTTPS. The client manages session tokens for authenticated users and supports offline capabilities through service workers. It is designed to function on both mobile and desktop platforms.

Every server is responsible for authentication, authorization, and processing orders, including payment handling through Stripe. Business logic and request validation are handled at this level.

Each server operates within a decentralized peer-to-peer network, where any store server can act as either a Home Server or a Visiting Server. Sensitive user data remains stored on the user’s Home Server. Communication between servers is secured using TLS to ensure encrypted data exchange.

Users interact with the client, which sends HTTPS requests to the appropriate server. The server validates and processes the request, interacts with the database and/or external services as needed, and then returns a response to the client.

Because the system uses a decentralized architecture, individual stores can operate independently while leveraging geographic distribution to reduce latency. This design supports horizontal scaling, as new stores can be deployed with the same software stack and integrate into the network without requiring architectural changes.

The database uses PostgreSQL to store system data, including user accounts, order history, preferences, and related records. It enforces foreign key constraints and follows normalization principles to prevent redundancy and maintain consistent data integrity.

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

---

#### **Table: `Flavors`**

Stores the types of flavors inside of the syrup or soda so the AI can better match flavors together.
| Syrup ID | Name | Primary Flavor | Secondary Flavor | Tertiary Flavor |
| :------------ | :----------------- | :--------------- | :--------------- | :--------------- |
| `primary_key` | String (max `255`) | String | String | String |

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

#### **Table: `USER_Home_Server`** (Many-to-Many Join Table)

Tracks user credentials with their home server.

| id            | UserName               | Home Server      |
| :------------ | :--------------------- | :--------------- |
| `primary_key` | `Username` from `user` | `Home Server id` |

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

## 6. Peer to Peer Networking

This system uses a distributed peer-to-peer (P2P) server model where each server can operate independently while also communicating securely with other servers. Every server is capable of acting as both a home server (authoritative data owner) and a visiting server (temporary access node). This architecture supports geographic distribution, scalability, redundancy, and reduced latency for global users.

The design ensures:

- Data locality for performance

- Authoritative ownership of sensitive information

- Controlled replication of non-sensitive data

- Secure inter-server communication

- Reduced cross-server API overhead

### 6.0 Terms

#### Home Server

The home server is the authoritative server where a user's primary account record is stored.

Characteristics:

- Stores all permanent user data.

- Acts as the source of truth for authentication and sensitive data.

- Processes all security-sensitive operations.

- Maintains full user profile, and permissions

- Only one home server exists per user.

---

#### Visiting Server

A visiting server is any server that temporarily services a user whose account resides on another server.

Characteristics:

- Does not permanently store user data.

- Requests and caches non-sensitive data from the home server.

- Routes sensitive operations back to the home server.

- Improves user experience by reducing geographic latency.

---

#### Sensitive Information

Data classified as requiring heightened security controls.

Examples:

- Password hashes

- Multi-factor authentication secrets

- Government identifiers

- Encryption keys

Sensitive information:

- Is never replicated.

- Is never cached on visiting servers.

- Must only be accessed through secure inter-server requests.

---

#### Permanent Data

Data that must persist long-term and remain authoritative on the home server.

Examples:

- Orders

- Saved drinks

- Drink preferences

- Account settings

- Region access permissions

---

#### Ephemeral Data

Temporary data used only during a session.

Examples:

- Session tokens

- Temporary access tokens

- Cache entries

- Geo-location routing data

---

Authoritative Source

The server that owns and validates a specific dataset. In this system, the home server is the authoritative source for all user account data.

---

#### Inter-Server API

A secure internal API used exclusively for server-to-server communication.

Requirements:

- Encrypted (TLS)

- Authenticated via mutual authentication or signed service tokens

- Rate-limited

- Logged for auditing

---

### 6.1 Home and Visiting Server Assignment

When a user creates an account:

- The system assigns a home server based on geographic region

- All permanent and sensitive data is stored on that home server.

- The home server becomes the authoritative data owner.

---

#### Single-Region Users

Users such as:

- Logistics managers

- Store managers

- Regional administrators

These users:

- Are always routed directly to their home server.

- Do not require cross-server communication.

---

#### Multi-Region Users

Users such as:

- Customers

- Super administrators

These users:

- Are routed dynamically based on geographic proximity.

- May connect to a visiting server if not near their home server.

- Experience reduced latency via local routing.

- If a user connects to a non-home server, that server operates as a visiting server.

---

### 6.2 Cross-Server User Session Handling

Since user data resides on a single home server, the visiting server must coordinate access.

#### Account Creation

1. User enters information to create an account

2. Server checks table of all user information

3. if there is no match, account creation proceeds

4. User table is updated and sent to other servers.

#### Login Process

1. User submits credentials.

2. Server checks registry for all assigned users and routes to home server

3. If credentials are valid:
   - Home server generates a temporary signed access token.

   - Visiting server establishes session using token.

4. Visiting server stores:
   - Home server location

   - Non-sensitive cached data

   - Session expiration time

Passwords are never transmitted in plain text and are never stored outside the home server.

---

#### Data Transfer Rules

Data Sent to Visiting Server (Temporary Cache)

- Order history

- Saved drinks

- Drink preferences

- Non-sensitive profile data

Data Never Sent

- Password hashes

- MFA secrets

- Encryption keys

---

#### Payment and Order Processing

When a user initiates payment on any server:

1. All payment will be handled by stripe.

2. Order is created
   - Order ID generated

   - Order added to account history

   - Order added to orders list

3. Stripe processes payment

4. Home server updates permanent order data.

5. If order is on visiting server, order is saved to visiting server and home server.

#### The visiting server never handles raw payment data.

---

### 6.3 Data Synchronization and API Optimization

#### Login Discovery Process

To reduce system-wide API load:

1. All users and their home server is stored on every server.

2. Once a username match is found:
   - Home server is contacted for logging in.

3. This reduces:
   - Broadcast authentication overhead

   - Latency

   - Cross-server traffic

---

#### User Table Updates

The user table must be up to date across all servers.

This table will be automatically updated every hour to ensure data parity.

---

#### Caching Strategy

Visiting servers maintain:

- Temporary cache of non-sensitive user data

- Session tokens

- Cache expiration timestamps

Cache invalidation policies:

- Time-based expiration

- Manual invalidation after account updates

- Forced refresh on critical actions

No sensitive data is cached.

---

### 6.4 Security Requirements for Peer-to-Peer Servers

For secure P2P operation, servers must:

1. Use Mutual Authentication
   - Each server must verify the identity of other servers before accepting requests.

2. Encrypt All Inter-Server Traffic
   - All communication must use TLS.

3. Enforce Principle of Least Privilege

   Visiting servers:
   - May request only required data.

   - Cannot directly modify sensitive data.

4. Maintain Audit Logs

   All inter-server requests must log:
   - Requesting server

   - Timestamp

   - User ID

   - Operation performed

5. Rate Limiting

   To prevent abuse:
   - Limit login discovery calls

   - Limit cross-server payment attempts

---

### 6.5 Server Failure and Fault Tolerance

If a visiting server fails:

- User reconnects to nearest available server.

- Home server remains authoritative.

If a home server fails:

- User login is temporarily unavailable.

- No other server may assume authority

### 6.6 Scalability and Load Balancing

To ensure system scalability:

- Home server assignment should distribute users evenly.

- Visiting servers should monitor CPU and memory usage.

- Geographic routing should consider both latency and server load.

- Health checks must determine server availability.

### 6.7 Data Privacy Model

This system follows a strict data separation model:

- Sensitive data remains centralized per user.

- Non-sensitive data may be cached temporarily.

- Permanent writes always return to home server.

- Visiting servers act only as operational proxies.

This ensures:

- Reduced attack surface

- Compliance readiness

- Controlled data ownership

- Predictable data consistency

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
- **At Rest:** Sensitive user data (like passwords) will not be stored in plaintext. Django’s default PBKDF2 password hasher will be used, with the possibility of easily updating later to a newer algorithm (e.g. Argon2id) based on OWASP and NIST recommendations. Payment information is solely handled by Stripe.

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
