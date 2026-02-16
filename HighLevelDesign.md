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

Relevant and detailed information can be found under the [Data Classification & Security](#4-data-classification--security) section of this document

---

## 2. Hardware Platforms

Customers will access Codepop from personal devices (smartphones, tablets, or laptops) using their preferred web browser (Chrome, Firefox, Edge, Safari). The web application will be responsive across screen sizes and can be offered as a Progressive Web App (PWA) for an installable, native-like experience.

### 2.1 Mobile & Touch

- **Responsive Design:** Implement a mobile-first, fluid layout using CSS Grid and Flexbox. Define standard breakpoints (e.g., 320px, 480px, 768px, 1024px, 1280px) and prefer relative units (`rem`, `%`, `vw`) for spacing and typography. Serve responsive images (`srcset` / `sizes`), optimize touch targets (>=44px), and use media queries (and container queries where supported) to adapt component layouts. Use design tokens (CSS variables) for consistent theming, follow progressive enhancement, and validate UI across real devices, emulators, and automated visual regression tests.
- **Gestures:** Implement gesture support using Pointer Events and a lightweight gesture library (for example, `@use-gesture/react` or `hammerjs`). Provide swipe gestures for carousels and in-app navigation, pinch-to-zoom and double-tap to zoom for images/previews, and long-press where appropriate. Use CSS `touch-action` to avoid scroll/gesture conflicts, set sensible gesture thresholds and debounce to reduce accidental activations, and avoid calling `preventDefault()` on touch events unless necessary. Always provide accessible fallbacks (visible buttons and keyboard equivalents), respect `prefers-reduced-motion`, and validate gestures across iOS and Android devices and major browsers.

### 2.2 Web / Desktop

- **Technology:** Code Pop will be made as a Progressive Web App (PWA) to be accessed as a website but feel more like an app to provide a more native interation for the User. 
- **Service Workers:** Implement a Service Worker (using Workbox or a small custom worker) to provide reliable offline behavior and efficient caching. Precache the application shell (HTML, core JS/CSS, critical assets) so the app can load while offline. Use runtime caching strategies tuned per resource type: network-first for API requests with a short fallback cache, stale-while-revalidate for images and static assets, and cache-first for large immutable resources with proper cache versioning and max-age limits. Provide background sync for failed POSTs (order submission) so retries occur when connectivity returns. Ensure the Service Worker follows HTTPS requirements, handles updates gracefully (skipWaiting/clients.claim patterns with an optional user-visible update prompt), and exposes health/diagnostic hooks for remote monitoring.
- **Manifest:** Include a complete `manifest.json` to enable installability and a native-like launch experience. Provide `name` and `short_name`, a descriptive `description`, `start_url`, `scope`, `display` (prefer `standalone`), `orientation`, `theme_color`, and `background_color`. Ship a full set of icons (PNG/SVG) at recommended sizes (48, 72, 96, 144, 192, 512) and include service-worker-aware icon references. Test installability on Chrome, Edge, and Safari (where supported) and document icon generation and caching requirements.
- **Push Notifications:** Support opt-in Web Push using the Push API + Notifications API with VAPID keys for server authentication. Request permission using a contextual UX (ask after a user action or clear value exchange), allow segmentation (order updates, promotions, local store alerts), and include actionable buttons and deep links into the app. Respect user preferences and rate limits — include unsubscribe and quiet-hours options, follow consent/GDPR rules (store consent server-side), and avoid spammy behavior. Implement push handling in the Service Worker to show notifications when appropriate, handle `notificationclick` to route users to relevant views, and capture delivery/engagement metrics for analytics and A/B testing.

### 2.3 IoT & Future Platforms (Optional)
- [Describe potential future integrations, e.g., Voice Assistants, Wearables, AR/VR.]

## IoT

- Install IoT devices in soda making machine to track:
  - Stock levels
  - Temperature
  - Machine Health
  - Sales per location
- Connects to the PWA to dyamically show the avliableility of items 

- Integrate AI with Iot to provide:
  - Demand Forecasting 
  - Dynamic Pricing
  - Predictive Maintenance

## Future Platforms 

- Voice Assistant that allows the User a seemless expereience where they don't have to physically interact with the PWA and can simiply navigate to where they need to go and order. This would be usefuls for the visually impared or those who are doing an avtivity that requires sight such as driving. 

---

## 3. User Interface (UI)

### 3.1 Concept and Design

- **Consistency:** The site is designed around the same components, colors, and styles to ensure a consistent experience across the entire application. This consistency allows users to easily understand how to interact with the application, and where to find the information they need.
- **Navigation:** The navigation is designed to be intuitive, with a clear hierarchy and logical flow between pages. The main page provides easy access to the most important features for each user level (e.g., ordering for customers, inventory management for store managers) and the navigation menu allows for easy access to other sections of the site.
- **Accessibility:** The site is designed with accessibility in mind, ensuring that colors and fonts are chosen for readability and that the application is usable by individuals with disabilities.

### 3.2 Color Palette

- **Background:** `#FCF8FF` - Off-White
- **Text:** `#0A0A0A` - Dark Gray
- **Primary:** `#FFFFFF` - White
- **Secondary:** `#030213` - Charcoal Black
- **Accent/Contrast:** `#9810FA` - Vibrant Purple
- **Neutral:** `#ECECF0` - Light Gray

### 3.3 Frameworks and Tools (Tech Stack)

- **Frontend:** ReactJS
  - _Reasoning:_ React has many developer focused features, such as a large ecosystem of libraries, reusable components, and a virtual DOM for efficient rendering. This allows us to rapidly develop a responsive and dynamic user interface that can easily adapt to different hardware platforms. Additionally, React's component-based architecture promotes code reusability and maintainability, which is crucial for a project of this scale and complexity.
- **Backend:** Django (Python)
  - _Reasoning:_ Django was primarily chosen for its ease of use, security features, and scalability. Django's built-in admin interface allows for easy management of the database and user accounts, while its robust security features help protect against common web vulnerabilities. Additionally, Django's scalability allows us to handle a growing user base and increasing data volume as the application expands.
- **Database:** PostgreSQL
  - _Reasoning:_ PostgreSQL was used because it works well with our other software choices, and is a powerful, open-source relational database that offers advanced features such as support for JSON data types. This allows us to efficiently store and query complex data structures, which is essential for the functionality of our application.

---

## 4. Data Classification & Security

All data, when possible, should be encrypted. This helps ensure that security remains a priority, and decreases the likelihood of malicious individuals gaining unauthorized access to information and systems that should otherwise be protected.

### 4.1 Definitions

- **Personal Data:** Information that identifies an individual (e.g., Names, Emails). _Security Standard: [e.g., Encrypted in transit]_
- **Sensitive Data:** High-risk information (e.g., Financials, Store Information, Location Data). _Security Standard: [e.g., Encrypted at rest and in transit]_
- **Other Data:** Non-identifiable information (e.g., preferences, order history). _Security Standard: [e.g., Encrypted at rest and in transit]_

### 4.2 Data Breakdown by Role

| User Role               | Personal Data Collected | Sensitive Data Collected                | Other Data                                     |
| :---------------------- | :---------------------- | :-------------------------------------- | :--------------------------------------------- |
| **Guest Customer**      | None (Transient)        | Location, Payment Token                 | Session Order Data                             |
| **Registered Customer** | Name, Email, Username   | Location, Payment Token, Chat Logs      | Drink Preferences, Order History, Saved Drinks |
| **Store Manager**       | Name, Employee ID       | Payroll Info, Store Performance Data    | Local Inventory Logs                           |
| **Logistics Manager**   | Name, Employee ID       | Regional Supply Data, Route Data        | Work History                                   |
| **Repair Staff**        | Name, Employee ID       | Machine Status Logs                     | Assigned Tickets, Route History                |
| **Admin (Local)**       | Name, Employee ID       | Access Logs, Local User Management Logs | System Configuration History                   |
| **Super Admin**         | Name, Employee ID       | Global System Config, Full Access Logs  | Global Inventory & Sales Data                  |

### 4.3 Encryption Guidelines

#### **Data in Transit:**

To ensure the definitive security of all data, everything in transit must be encrypted. Meaning that, regardless of what _we_ deem as sensitive, everything is protected, ensuring that there's no possibility of unauthorized access while data is being transmitted.

- All client-server communication must occur over HTTPS using TLS 1.2+.
- API endpoints and website access must occur using token-based authentication (Django Token Auth) to prevent unauthorized interception

#### **Data at Rest:**

Data will be encrypted at rest using a transparent encryption layer when possible. This ensures that there are no additional complexities that the developers have to manage. Thus, the likelihood of incorrect implementations decreases drastically.

- **Database:** User passwords are automatically hashed using PBKDF2 (Django default) with the option to upgrade to Argon2.
- **Sensitive Fields:** Payment information is _not_ handled directly by our systems; only Stripe tokens are retained. Personally Identifiable Information should be encrypted when possible using `Django-encrypted-fields`.

### 4.4 Secure Code Guidelines

#### Web Security Considerations

Codepop must be resilient against common vulnerabilities, including but not limited to:

- **SQL Injection:** Prevented by Django's Object-based (ORM) implementation of SQL commands, treating all user inputs purely as text.
- **Cross-site Scripting (XSS):** React by default treats all rendered variables as pure text, instead of just putting it into the webpage. This prevents instances where if a malicious username is rendered, even if there is code by way of `<script>` tags, these are not executed in the browser.
- **CSRF:** Prevented by using Django's CSRF Token checks during state-changing requests (e.g. POST, PUT, DELETE). Only valid, active sessions have a usable CSRF token, preventing random websites from sending requests to the database.
- **Denial of Service (DoS)**

#### General Security & Language Considerations

- **Safety Features:** React and Django already have built-in security features that prevent malicious user input from being executed. Both by default treat user input and variables as plain text; thus, although input sanitation is good practice, there's another layer of safety in case the sanitation methods don't catch everything.
- **Unsafe Functions:** Unsafe functions, such as Python's `eval()` or React's `dangerouslySetInnerHTML` should not be used, as these bypass many of the security benefits of the frameworks. If they absolutely must be used for a specific feature, these functions **_can not_** use user-provided values.
- **Input Validation:** User inputs, especially ones being sent to the AI Chatbot, should be sanitized to prevent prompt injection or processing of malicious code.
- **Error Handling:** Users will receive generic "something went wrong" messages when an error occurs. This prevents general users from being overwhelmed from seeing a stack trace, and no longer trusting the company to be secure. Detailed Stack Traces will be logged internally for debugging.

### 4.5 Hardware & Device Security

- **Client Side:** The mobile app acts as a client that communicates via a secure token. Users can revoke these tokens by way of a password reset in cases of lost or stolen devices.
- **Server Side:** The backend is separated from the client. Access to the API is restricted to only authorized users via authenticated tokens.
- **Stripe Integration:** The information within the [Stripe Developer Documentation](https://docs.stripe.com/) will be strictly followed. This ensures that the security of user's credit card information is handled by a reliable and reputable company.

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

#### UML Sequence Diagram
> sequenceDiagram

    User->>Client: initiateOrder()
    Client->>Controller: HTTPS request (order data)

    Controller->>Service: validateRequest()
    Service->>DB: fetchUser/session data
    DB-->>Service: user data

    Service->>Store: checkAvailability()
    Store-->>Service: availabilityConfirmed

    Service->>Stripe: processPayment()
    Stripe-->>Service: paymentResult

    alt Payment successful
        Service->>DB: saveOrder()
        Service->>Store: queueOrder()
        Service-->>Controller: success response
    else Payment failed
        Service-->>Controller: error response
    end

    Controller-->>Client: updated data/view
    Client-->>User: render confirmation



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
