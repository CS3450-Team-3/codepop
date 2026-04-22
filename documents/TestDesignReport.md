# Test Design Report: CodePop

**Version:** Final (Spring 2026)

**Team:** SocialDrinkers (3)

---

- [Test Design Report: CodePop](#test-design-report-codepop)
  - [1. Introduction: Testing Journey \& Mindset](#1-introduction-testing-journey--mindset)
  - [2. Testing Approach: How We Tested](#2-testing-approach-how-we-tested)
    - [2.1 Backend Isolation Testing](#21-backend-isolation-testing)
    - [2.2 Frontend API \& Interaction Testing](#22-frontend-api--interaction-testing)
  - [3. System-Level (End-to-End) Testing](#3-system-level-end-to-end-testing)
    - [3.1 Automated Multi-Instance Orchestration](#31-automated-multi-instance-orchestration)
    - [3.2 Reproducing Results](#32-reproducing-results)
    - [3.3 Manual User Acceptance Testing (UAT)](#33-manual-user-acceptance-testing-uat)
  - [4. What We Learned and Fixed](#4-what-we-learned-and-fixed)
    - [4.1 The Importance of Automated Integration Testing](#41-the-importance-of-automated-integration-testing)
    - [4.2 Vulnerability Discovery: RBAC Security Gap](#42-vulnerability-discovery-rbac-security-gap)
    - [4.3 Resolution: Serializer Redaction and Permission Enforcement](#43-resolution-serializer-redaction-and-permission-enforcement)
    - [4.4 Discovery: Server-to-Server Authentication Bottlenecks](#44-discovery-server-to-server-authentication-bottlenecks)
    - [4.5 Challenge: Leader Election and Network Convergence](#45-challenge-leader-election-and-network-convergence)
  - [5. Challenges \& Areas of Concern](#5-challenges--areas-of-concern)
    - [5.1 Distributed System Testing](#51-distributed-system-testing)
    - [5.2 Frontend UI Automation](#52-frontend-ui-automation)
    - [5.3 Reflections on RBAC Design](#53-reflections-on-rbac-design)
    - [5.4 Current Worries](#54-current-worries)
  - [6. Code Coverage \& Metrics](#6-code-coverage--metrics)
    - [6.1 Backend Coverage](#61-backend-coverage)
    - [6.2 Frontend Coverage](#62-frontend-coverage)
  - [7. Final Results \& Presentation Readiness](#7-final-results--presentation-readiness)
    - [7.1 Final Execution Results](#71-final-execution-results)
    - [7.2 Instructions for the Presentation Team](#72-instructions-for-the-presentation-team)
  - [8. Appendices (Screenshots \& Logs)](#8-appendices-screenshots--logs)
    - [8.1 Automated Multi-Instance Orchestration Log](#81-automated-multi-instance-orchestration-log)

---

## 1. Introduction: Testing Journey & Mindset

Our testing journey for CodePop has been a transformative experience for our team. We moved from viewing testing as a checkbox requirement to seeing it as the fundamental bedrock of our development lifecycle. 

Early on, we deeply learned about the importance of automated tests when developing a project of this scale. As our system evolved into a complex, decentralized Peer-to-Peer (P2P) network, our mindset shifted from local verification to system-wide resilience. We recognized that in a distributed environment, "success" is defined not just by individual components working correctly, but by the network's ability to maintain consistency, security, and availability under real-world conditions. 

This report details how our automated suites caught critical security vulnerabilities and guided our architectural decisions, ensuring that CodePop is robust and ready for its final delivery.

## 2. Testing Approach: How We Tested

To ensure stability across our decentralized architecture, we adopted a tiered testing strategy:

- **Isolation Layer (Backend Unit):** We used Django `unittest` and `APITestCase` to validate core models (Inventory, Orders, Users) and security logic in a controlled environment.
- **Interaction Layer (Frontend API):** Utilizing a custom TypeScript test runner (`api_tests.ts`), we verified that the frontend models correctly interface with the backend API and handle real-world data shapes.
- **Orchestration Layer (System Integration):** We employed a custom multi-instance framework to simulate complex P2P conditions, including cross-server authentication and regional data aggregation.

### 2.1 Backend Isolation Testing

- **Framework:** Django `unittest` and `REST Framework APITestCase`.
- **Strategy:** We used `unittest.mock` to simulate network traffic for fast logic verification, allowing for rapid iteration without needing a live network for every test.
- **Scope:**
  - **Model & Logic:** Validated core data models (Inventory, Orders, Users) and business logic.
  - **P2P Security:** Verified RS256 asymmetric signature validation and public key exchange logic in isolation.
  - **Authentication:** Tested JWT claim verification and proxy authentication logic.
- **Automation:** Integrated into the development workflow (`python manage.py test`) to catch regressions during daily coding.

### 2.2 Frontend API & Interaction Testing

- **Framework:** Custom TypeScript Test Runner (`api_tests.ts`).
- **Strategy:** Conducted end-to-end API verification from the frontend's perspective.
- **Scope:**
  - Authentication flows (Login, Register, Profile Management).
  - Business logic (Drink creation, Ordering, Inventory management).
  - Cross-cutting features (Chatbot, Notifications, Revenue).
  - Admin/P2P controls (Server discovery, Master list access).
- **Automation:** Executed via `npx ts-node models/tests/api_tests.ts` to ensure frontend-to-backend compatibility.

## 3. System-Level (End-to-End) Testing

While unit testing accounts for how the system works in isolation, it cannot simulate the complexities of our distributed architecture. Our system-level testing orchestrates live server instances, real database interactions, and authentic HTTP communication.

### 3.1 Automated Multi-Instance Orchestration

Our core integration verification is handled by `full_p2p_automated_test.py`. This script automates a high-fidelity, system-wide environment:

- **Dynamic Infrastructure:** Spins up three independent Django servers (A, B, and C) on dynamic ports and three separate PostgreSQL databases to ensure zero state-leakage.
- **Auto-Discovery & Sync:** Verifies that servers can cross-register using RSA public keys and that the global `MasterList` correctly propagates.
- **Cross-Server Flows:** Tests "Roaming" user scenarios where a user registered on Server A logs in and performs actions on Server B, which are then proxied back to their home server.
- **Full-Stack Features:** Verifies Stripe integration, Machine proxying, Global aggregation, and Fault tolerance (terminating a node to verify network resilience).

### 3.2 Reproducing Results

To reproduce our system-level test results, follow these steps:

1.  **Activate Environment:** `source codepop_virtual_enviroment/bin/activate`
2.  **Run Orchestration Suite:** `python codepop_backend/integration_tests/full_p2p_automated_test.py`
3.  **Verify Output:** The script will execute 17 sections of tests. A final summary log will appear at the end.
4.  **Expected Outcome:** All 17 verification steps (Auth, Proxying, Stripe, Aggregation, etc.) must return **"SUCCESS"**.

### 3.3 Manual User Acceptance Testing (UAT)

While our automated suites provide a rigorous baseline, we perform manual User Acceptance Testing to ensure the system meets our high standards for user experience and visual feedback. These scenarios simulate real-world usage patterns across the decentralized network.

| Scenario | Prerequisites | Execution Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **1. Roaming Authentication & Profile Persistence** | A user account registered on Server A. | 1. Access the login page of Server B.<br>2. Authenticate using Server A credentials.<br>3. Navigate to the "Profile" page. | Access is granted via P2P proxy; the user's profile data and preferences from Server A are displayed accurately on Server B. |
| **2. Cross-Server Distributed Soda Catalog** | Featured sodas exist on Server A but not on Server B. | 1. Log in to Server B as a Server A user.<br>2. Open the drink creation menu. | The menu dynamically lists sodas and ingredients from the user's Home Server (A) through the distributed proxy layer. |
| **3. End-to-End Transactional Integrity** | Stripe Mocking is enabled; Inventory exists. | 1. Build a custom drink.<br>2. Proceed to checkout.<br>3. Enter mock payment details. | The order is processed; Inventory counts are decremented locally; Revenue records are generated; Order appears in History. |
| **4. Regional Logistics Oversight** | Multiple servers active in a single region. | 1. Log in as a Logistics Manager.<br>2. Access the "Regional Inventory" dashboard. | The manager can view aggregated inventory levels from all stores in their region and trigger manual stock updates via proxy. |
| **5. Super Admin Global Governance** | Multiple servers active across multiple regions. | 1. Log in as Super Admin.<br>2. Access the "Global Revenue" and "Server Registry" views. | Aggregated revenue data from all global regions is retrieved; The status and health of all peer nodes are visible in real-time. |

## 4. What We Learned and Fixed

The testing sprint provided invaluable insights into our system's behavior and helped us identify and resolve critical issues before the final presentation.

### 4.1 The Importance of Automated Integration Testing

The introduction of our **Integration Tests Suite** was a turning point. We have been updating it continuously to ensure that nearly every feature in the project is tested in a live environment. This suite was not just a tool for verification; it became our primary discovery mechanism for architectural flaws and security gaps.

### 4.2 Vulnerability Discovery: RBAC Security Gap

While running our integration tests earlier this week, we uncovered a significant security vulnerability: the **inventory report API had its RBAC (Role-Based Access Control) security configuration mistakenly removed**. 

Because of this oversight, Customers or Guests could have accessed full, detailed inventory reports just by knowing the endpoint URL. This kind of vulnerability, while seemingly minor in a local environment, would have been a major risk in a production-ready decentralized system.

### 4.3 Resolution: Serializer Redaction and Permission Enforcement

Upon discovery, we were able to quickly fix this on the backend with targeted edits:
1.  **Permission Enforcement:** Re-applied `permission_classes` to the `InventoryReportAPIView` to restrict access to authorized roles (Managers and Peer Servers).
2.  **Serializer Redaction:** Updated the `InventorySerializer` to proactively redact sensitive information. If a Customer or Guest attempts to access inventory data, the serializer now removes fields like `Quantity` and `ThresholdLevel`, returning only an `InStock` boolean status.

### 4.4 Discovery: Server-to-Server Authentication Bottlenecks

Our integration tests also revealed a bottleneck in how **Global Aggregation** worked. Initially, the Super Admin's JWT was being proxied to all peer servers during revenue aggregation. However, we found that this created a "trust chain" issue: a peer server in one region might not immediately have the public key required to verify a JWT issued by a server in a different region.

**The Fix:** We pivoted to a dedicated `Server-Token` authentication scheme for inter-server calls. By introducing a `RevenuesPeerView` that uses `IsPeerServer` permissions, we decoupled administrative user sessions from the low-level data synchronization, making the global dashboard significantly more reliable and faster to load.

### 4.5 Challenge: Leader Election and Network Convergence

Testing the P2P synchronization logic exposed a "split-brain" risk where multiple servers in the same region could both claim to be the "Leader" if they were started simultaneously. This caused data duplication during the master-list sync.

**What we learned:** We refined our server setup logic to explicitly distinguish between "Creating" a region and "Joining" one. A joining server is now strictly forbidden from becoming a leader during its initial handshake, ensuring that the network always converges on a single source of truth for regional data. This fix was verified by our multi-instance test script, which ensures that complex P2P scenarios—like roaming and aggregation—function correctly under this refined setup logic.

## 5. Challenges & Areas of Concern

### 5.1 Distributed System Testing

The most significant challenge was verifying roaming user functionality. Maintaining location-agnostic access required a complex proxying architecture rather than simple database replication. Simulating real-time network requests between instances to ensure data consistency was a hurdle that only our multi-instance orchestration suite could reliably clear.

### 5.2 Frontend UI Automation

A major technical challenge we faced was the portability of frontend UI tests. While we successfully developed a large-scale test suite using Jest and Playwright, we encountered significant environment-dependency issues when attempting to run it across different developer machines. The complexity of configuring headless browsers and consistent timing across different hardware meant that we could not reliably integrate these tests into our shared CI/CD workflow within the project's timeline. This remains a key area for future infrastructure improvement.

### 5.3 Reflections on RBAC Design

The discovery of the RBAC vulnerability led us to reflect on our overall security architecture. If we were to start this project over, we would change several things about our RBAC implementation. Specifically, we would prefer making the **proxying part of it a middleware**, in a similar fashion to how the authentication permissions middleware is handling it. This would consolidate the logic and reduce the risk of accidentally omitting security checks on individual views.

### 5.4 Current Worries

Despite our rigorous testing, some areas still warrant caution:
- **Network Latency during P2P Discovery:** High latency environments might still expose timing issues in initial server handshakes.
- **Race Conditions in High-Volume Inventory Updates:** Ensuring total consistency during simultaneous heavy ordering remains a point of concern.
- **AI Logic Edge Cases:** Validating that the AI system handles complex, overlapping requests without error.

## 6. Code Coverage & Metrics

| Layer    | Unit Tests | Integration Tests           | Overall Coverage (Combined) |
| -------- | ---------- | --------------------------- | --------------------------- |
| Backend  | ~70%       | ~50% (Overall) / 95%+ (P2P) | ~72%                        |
| Frontend | 0%         | ~20% (API/Model Layer)      | ~20%                        |

### 6.1 Backend Coverage

We maintained approximately 72% overall code coverage for the backend. We prioritized the P2P networking and security logic, which has **95%+ coverage** via the orchestration suite. Standard Django unit tests handle model validation and CRUD operations.

### 6.2 Frontend Coverage

Frontend coverage is at **~20%**, focused on the API and Model layer. We rely on our TypeScript test runner to exercise frontend communication. 

It is important to note that a significant effort was made to implement a comprehensive frontend automated testing suite using **Jest and Playwright**. This suite was designed to provide deep coverage of the UI and user interactions. However, due to time constraints and environment-specific dependencies that limited its execution to a single development machine, we were unable to merge this suite into the master branch for the final release. Consequently, the React UI presentation layer is primarily verified through manual testing and User Acceptance Tests (UAT), while the automated metrics reflect only the API/Model layer.

## 7. Final Results & Presentation Readiness

This section summarizes our final testing results and provides instructions for the team handling the final presentation to ensure they can successfully reproduce our findings and demonstrate the application's functionality.

### 7.1 Final Execution Results

In our final pre-presentation run, the automated orchestration suite passed all 17 sections successfully. Our regression tests for both the backend and frontend were completed with no new failures, confirming that our recent security fixes did not introduce regressions in core business logic.

### 7.2 Instructions for the Presentation Team

To ensure a smooth demonstration, the following steps should be followed to reproduce the system-level results and verify the core P2P features of CodePop:

1.  **Run the Automated Orchestration Suite**
    *   **Action:** Execute `python codepop_backend/integration_tests/full_p2p_automated_test.py` from the project root.
    *   **Expected Outcome:** All 17 sections pass, showing a clean, functional network across three nodes.
2.  **Demonstrate Roaming Authentication**
    *   **Action:** Authenticate on a visiting server (e.g., Server B) using credentials for a user whose account belongs to a different home server (e.g., Server A).
    *   **Expected Outcome:** The proxy login succeeds, and the user's role-based access is correctly preserved.
3.  **Verify Cross-Server Business Flows**
    *   **Action:** Perform profile updates or place an order while connected to a visiting server.
    *   **Expected Outcome:** The operations are correctly proxied and synchronized back to the home server.
4.  **Showcase RBAC Security (The "Fixed" Vulnerability)**
    *   **Action:** Attempt to access the `/backend/inventory/report/` endpoint as a Customer.
    *   **Expected Outcome:** The system returns a `403 Forbidden` or provides redacted data (only showing `InStock` status), proving that sensitive counts are no longer exposed.
5.  **Demonstrate Global Aggregation**
    *   **Action:** Log in as a Super Admin and access the Global Revenue dashboard.
    *   **Expected Outcome:** The dashboard successfully pulls and aggregates data from all regional nodes via the `Server-Token` authentication scheme.

## 8. Appendices (Screenshots & Logs)

### 8.1 Automated Multi-Instance Orchestration Log

![Integration Suite example log output for an earlier version of the design](/documents/images/integration_suite_log.png)
