> **Remove on document completion:**
>
> These points are addressed in the document:
> A Hardware Platform is chosen (mobile, web app, desktop, etc.)
> User Interface - consider branding, color schemes, skins, the flow from one area to another
> Input and Output - the kinds of I/O to be processed, and how much of it there will be
> The project is divided into components
>
> - Internal Interfaces - how these components will interact with each other
> - External Interfaces - which systems the system will interact with
>
> Include expressive diagrams that capture the architecture, components, and interactions within the system. Different types of diagrams serve various purposes:
>
> - UML Class Diagrams are great for object-oriented design
> - UML Sequence Diagrams help to visualize the flow of control in a system, capturing the interactions among components in terms of sequenced messages
> - UML Use Cases capture the functional requirements of a system from the perspective of users

# Codepop High Level Design Documentation

**Version:** 0.5

**Date:** February 2026

**Author:** Team 3

---

## 1. Introduction

**Purpose:**

The purpose of this document is to provide the high-level architecture and design of **Codepop**, and automated beverage fulfillment ecosystem, designed to revolutionize the "dirty soda" industry. The system aims to minimize human labor requirements and provide a quick, easy, and efficient system whereby customer's orders are prepared just-in-time to minimize waiting periods and maximize flavor.

Codepop is built to support a decentralized system, allowing peer-to-peer communication between stores and supply hubs. Doing this, we can ensure just-in-time supply fulfillment as well as proactive maintenance, ensuring maximum uptime for each store. This document serves as a reference for stakeholders and developers to ensure the system is scalable, secure, and aligned with the goal of providing a high-satisfaction user experience.

### 1.1 Legal and Regulatory Considerations

> **Disclaimer:** This document does not constitute legal advice. As software developers, we do not have the relevant legal expertise to ensure that all regulatory requirements are met. It is the responsibility of stakeholders to ensure compliance with applicable laws and regulations (e.g., GDPR, CCPA, HIPAA) by conversing with appropriate legal council.

#### Compliance Goals:

As software developers, we are committed to ensuring the safety and security of the personal, proprietary, and sensitive information of the company and of the customers. We aim to adhere to industry standards and regulations, including:

- [**OWASP Top 10:**](https://owasp.org/Top10/2025/) The mitigation of common security vulnerabilities across the web, including injection attacks and broken access controls
- **PCI DSS:** Ensuring secure handling of payment information through a compliant third-party company (Stripe)

Relevant and detailed information can be found under the [Data Classification & Security](#2-data-classification--security) section of this document

---

## 2. Data Classification & Security

All data, when possible, should be encrypted. This helps ensure that security remains a priority, and decreases the likelihood of malicious individuals gaining unauthorized access to information and systems that should otherwise be protected.

### 2.1 Definitions

- **Personal Data:** Information that identifies an individual (e.g., Names, Birthdates). _Security Standard: [e.g., Encrypted in transit]_
- **Sensitive Data:** High-risk information (e.g., Financials, Gov ID, Location). _Security Standard: [e.g., Encrypted at rest and in transit]_
- **Other Data:** Non-identifiable information (e.g., preferences, order history). _Security Standard: [e.g., Encrypted at rest and in transit]_

### 2.2 Data Breakdown by Role

| User Role               | Personal Data Collected | Sensitive Data Collected                | Other Data                                     |
| :---------------------- | :---------------------- | :-------------------------------------- | :--------------------------------------------- |
| **Guest Customer**      | None (Transient)        | Location, Payment Token                 | Session Order Data                             |
| **Registered Customer** | Name, Email, Username   | Location, Payment Token, Chat Logs      | Drink Preferences, Order History, Saved Drinks |
| **Store Manager**       | Name, Employee ID       | Payroll Info, Store Performance Data    | Local Inventory Logs                           |
| **Logistics Manager**   | Name, Employee ID       | Regional Supply Data, Route Data        | Work History                                   |
| **Repair Staff**        | Name, Employee ID       | Machine Status Logs                     | Assigned Tickets, Route History                |
| **Admin (Local)**       | Name, Employee ID       | Access Logs, Local User Management Logs | System Configuration History                   |
| **Super Admin**         | Name, Employee ID       | Global System Config, Full Access Logs  | Global Inventory & Sales Data                  |

### 2.3 Encryption Guidelines

#### **Data in Transit:**

To ensure the definitive security of all data, everything in transit must be encrypted. Meaning that, regardless of what _we_ deem as sensitive, everything is protected, ensuring that there's no possibility of unauthorized access while data is being transmitted.

- All client-server communication must occur over HTTPS using TLS 1.2+.
- API endpoints and website access must occur using token-based authentication (Django Token Auth) to prevent unauthorized interception

#### **Data at Rest:**

Data will be encrypted at rest using a transparent encryption layer when possible. This ensures that there are no additional complexities that the developers have to manage. Thus, the likelihood of incorrect implementations decreases drastically.

- **Database:** User passwords are automatically hashed using PBKDF2 (Django default) with the option to upgrade to Argon2.
- **Sensitive Fields:** Payment information is _not_ handled directly by our systems; only Stripe tokens are retained. Personally Identifiable Information should be encrypted when possible using `Django-encrypted-fields`.

### 2.4 Secure Code Guidelines

#### Web Security Considerations

Codepop must be resilient against common vulnerabilities, including but not limited to:

- Cross-site Scripting (XSS)
- SQL Injection
- CSRF & Clickjacking
- Denial of Service (DoS)

#### Framework & Language Considerations

- **Safety Features:** [Describe utilizing built-in framework security features by default.]
- **Unsafe Functions:** [List functions to avoid, e.g., `eval()`.]
- **Updates:** [Policy on using LTS releases and patching.]

#### General Security

- **Input Validation:** [All user input (Strings, JSON, Files) must be validated before processing.]
- **Error Handling:** [Users receive generic error codes; detailed stack traces are logged internally only.]

### 2.5 Hardware & Device Security

- **Client Side:** [Policy on trusting client devices, session de-authorization.]
- **Server Side:** [OS configuration, logging, access control, physical access restrictions.]
- **3rd Party Integration:** [Criteria for vetting third-party security policies.]

---

## 3. Hardware Platforms

[Describe the targeted hardware strategy.]

### 3.1 Mobile & Touch

- **Responsive Design:** [Strategy for adapting layouts to screen dimensions.]
- **Gestures:** [Support for swipe, pinch, zoom, etc.]

### 3.2 Web / Desktop

- **Technology:** [e.g., Progressive Web App (PWA)]
- **Service Workers:** [Offline functionality and caching strategy.]
- **Manifest:** [Installability on home screens.]
- **Push Notifications:** [Engagement strategy.]

### 3.3 IoT & Future Platforms (Optional)

- [Describe potential future integrations, e.g., Voice Assistants, Wearables, AR/VR.]

---

## 4. User Interface (UI)

### 4.1 Concept and Design

- **Consistency:** [Rules for maintaining visual consistency across user roles.]
- **Navigation:** [e.g., Sidebar vs. Top bar navigation.]
- **Accessibility:** [Colors and fonts chosen for readability.]

### 4.2 Color Palette

- **Primary:** `#[HexCode]` - [Color Name]
- **Secondary:** `#[HexCode]` - [Color Name]
- **Accent/Contrast:** `#[HexCode]` - [Color Name]
- **Neutral:** `#[HexCode]` - [Color Name]

### 4.3 Frameworks and Tools (Tech Stack)

- **Frontend:** [e.g., Angular, React]
  - _Reasoning:_ [Why was this chosen? e.g., Modular design, Type safety.]
- **Backend:** [e.g., Ruby on Rails, Node.js]
  - _Reasoning:_ [Why was this chosen? e.g., Development speed, Gem ecosystem.]
- **Database:** [e.g., PostgreSQL, MongoDB]
  - _Reasoning:_ [Why was this chosen? e.g., Scalability, Relational integrity.]

---

## 5. Internal Components

[High-level architecture breakdown.]

### 5.1 Component Definitions

- **Client:** [Responsible for UI and displaying application views.]
- **Server:** [Handles logic, database queries, and 3rd party API orchestration.]
- **Database:** [Stores persistent data.]

### 5.2 Server Subcomponents

- **Controller:** [Validates requests, dictates views.]
- **View Module:** [Constructs the response for the client.]
- **API Handlers:** [Interface between the controller and external APIs.]

### 5.3 Database Schema

**Potential Tables:**

- `[Table Name]`: [Description of data stored.]
- `[Table Name]`: [Description of data stored.]
- `[Table Name]`: [Description of data stored.]

### 5.4 Component Diagram

> [Insert UML Component Diagram Here]

---

## 6. Internal Interfaces

### 6.1 System Dataflow

1.  User initiates request via Client.
2.  Client sends HTTPS request to Server.
3.  Server Controller processes request.
4.  Controller queries Database/API.
5.  Server responds with updated View/Data.
6.  Client renders data.

> [Insert Data Flow Diagram Here]

### 6.2 Component Interfaces

- **Client Interface:** [Input methods, display logic, encryption standards.]
- **Server Interface:** [MVC pattern implementation, API handler decoupling.]
- **Database Interface:** [ORM usage, SQL query responsibility.]

---

## 7. External Interfaces

[Describe 3rd party systems and APIs.]

### 7.1 Artificial Intelligence (AI)

- **Usage:** [How is AI used? e.g., Chatbots, Recommendation Engine.]
- **Interface Options:**
  - _Option A (Selected):_ [e.g., OpenAI API. List Pros/Cons.]
  - _Option B (Rejected):_ [e.g., Self-hosted Llama 2. List Pros/Cons.]
- **Resilience Strategy:** [What happens if the AI provider changes prices or shuts down? e.g., Building an abstraction layer.]

### 7.2 Single Sign On (SSO)

- **Target Providers:** [Google, Microsoft, GitHub, etc.]
- **Resilience Strategy:** [Ensure users can still login via Email/Password if SSO fails or is removed.]

### 7.3 Geolocation (Optional)

- **API:** [e.g., Browser Geolocation API, Google Maps API.]
- **Privacy:** [Handling user consent and refusal to share location.]
- **Resilience:** [Fallback methods for manual address entry.]

### 7.4 Payment Processing (Optional)

- **Strategy:** [Plan for current or future integration (e.g., Stripe, PayPal).]
- **Implementation:** [Use of decoupled handlers to allow switching providers.]
