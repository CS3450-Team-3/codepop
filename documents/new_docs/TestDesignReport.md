# Test Design Report: CodePop

- [Test Design Report: CodePop](#test-design-report-codepop)
  - [1. Introduction: Testing Journey \& Mindset](#1-introduction-testing-journey--mindset)
  - [2. Testing Approach (Draft 1: "How")](#2-testing-approach-draft-1-how)
    - [2.1 Backend Isolation Testing](#21-backend-isolation-testing)
    - [2.2 Frontend API \& Interaction Testing](#22-frontend-api--interaction-testing)
  - [3. System-Level (End-to-End) Testing](#3-system-level-end-to-end-testing)
    - [3.1 Automated Multi-Instance Orchestration](#31-automated-multi-instance-orchestration)
    - [3.2 Manual User Acceptance Tests (UAT)](#32-manual-user-acceptance-tests-uat)
  - [4. Challenges \& Areas of Concern](#4-challenges--areas-of-concern)
    - [4.1 Distributed System Testing](#41-distributed-system-testing)
    - [4.2 Distributed User Authentication](#42-distributed-user-authentication)
    - [4.3 Current Worries](#43-current-worries)
  - [5. Code Coverage \& Metrics](#5-code-coverage--metrics)
    - [5.1 Backend Coverage](#51-backend-coverage)
    - [5.2 Frontend Coverage](#52-frontend-coverage)
  - [6. Final Testing Execution Plan (Draft 2: "How")](#6-final-testing-execution-plan-draft-2-how)
    - [6.1 How We Will Execute Existing Tests](#61-how-we-will-execute-existing-tests)
    - [6.2 High-Risk Areas and Expected Failure Modes](#62-high-risk-areas-and-expected-failure-modes)
    - [6.3 How We Will Respond to Issues](#63-how-we-will-respond-to-issues)
    - [6.4 Coverage Targets and Final Demo E2E Rehearsal](#64-coverage-targets-and-final-demo-e2e-rehearsal)
  - [7. Appendices (Screenshots \& Logs)](#7-appendices-screenshots--logs)
    - [7.1 Automated Multi-Instance Orchestration Log](#71-automated-multi-instance-orchestration-log)

## 1. Introduction: Testing Journey & Mindset

Our approach to testing CodePop has been guided by four core principles:

- **Comprehensive Coverage:** Ensuring that all critical endpoints are tested thoroughly.
- **Resilience:** Testing how the system handles unexpected conditions and failures gracefully.
- **Distributed Consistency:** Ensuring project stability even when users are roaming from their Home Server.
- **Secureness:** Protecting against unauthorized access through rigorous cryptographic verification.

Because CodePop is a decentralized Peer-to-Peer (P2P) network, our testing journey evolved significantly during development. We initially started with standard Django unit tests to verify individual components. However, as the project evolved into a multi-node architecture system, our mindset shifted. We realized that "success" wasn't just passing local tests, but ensuring the network itself could survive peer discovery and data synchronization across multiple nodes without crashing or producing inconsistent state.

## 2. Testing Approach (Draft 1: "How")

To ensure stability across our decentralized architecture, we adopted a tiered testing strategy that addresses the application at different levels of granularity:

- **Isolation Layer (Backend Unit):** Using Django `unittest` and `APITestCase` to validate core models (Inventory, Orders, Users) and security logic in a controlled environment.
- **Interaction Layer (Frontend API):** Utilizing a custom TypeScript test runner (`api_tests.ts`) to verify that the frontend models correctly interface with the backend API and handle real-world data shapes.
- **Orchestration Layer (System Integration):** Employing a custom multi-instance framework to simulate complex P2P conditions, including cross-server authentication and regional data aggregation.

This layered approach ensures we catch issues early in isolation while still verifying the "big picture" network behavior that our users rely on.

### 2.1 Backend Isolation Testing

- **Framework:** Django `unittest` and `REST Framework APITestCase`.
- **Strategy:** Using `unittest.mock` to simulate network traffic for fast logic verification without requiring a live peer network.
- **Scope:**
  - **Model & Logic:** Validating core data models (Inventory, Orders, Users) and business logic.
  - **P2P Security:** Verifying RS256 asymmetric signature validation and public key exchange logic in isolation.
  - **Authentication:** Testing JWT claim verification and proxy authentication logic.
- **Automation:** Integrated into the development workflow (`python manage.py test`) to catch regressions early.

### 2.2 Frontend API & Interaction Testing

- **Framework:** Custom TypeScript Test Runner (`api_tests.ts`).
- **Strategy:** End-to-end API verification from the frontend's perspective.
- **Scope:**
  - Authentication flows (Login, Register, Profile Management).
  - Business logic (Drink creation, Ordering, Inventory management).
  - Cross-cutting features (Chatbot, Notifications, Revenue).
  - Admin/P2P controls (Server discovery, Master list access).
- **Automation:** Can be executed via `npx ts-node models/tests/api_tests.ts` to verify frontend-to-backend compatibility.

## 3. System-Level (End-to-End) Testing

While the unit and API testing can account for how the system works in isolation, it cannot accurately simulate the complexities of the distributed nature of the system. This phase orchestrates the deployment of multiple live server instances, real database interactions, and end-to-end user interactions, ensuring that we can accurately simulate real-world scenarios of how production environments will behave. Unlike the isolation testing mentioned in 2.1, this layer uses no mocks for network traffic, relying instead on real HTTP requests between live instances. To ensure CodePop functions before final deployment, we implement a high-fidelity, system-wide testing strategy.

### 3.1 Automated Multi-Instance Orchestration

Our core integration verification is handled by a sophisticated Python orchestration script: `full_p2p_automated_test.py`. This script automates a complex, multi-node environment by performing the following:

- **Dynamic Infrastructure:** Spins up **three independent Django servers** (A, B, and C) on dynamic ports and creates **three separate PostgreSQL databases** to ensure zero state-leakage between nodes.
- **Auto-Discovery & Sync:** Verifies that servers can cross-register using RSA public keys and that the global `MasterList` (user registry) correctly propagates across all three nodes.
- **Cross-Server Flows:** Tests "Roaming" user scenarios where a user registered on Server A logs in and performs actions (profile updates, preference creation) on Server B, which are then proxied back to their home server.
- **Full-Stack Features:** Beyond authentication, the script verifies:
  - **Stripe Integration:** Simulates complete order flows, including mock Stripe payment intents and webhook handling.
  - **Machine Proxying:** Tests the proxying of status data from a simulated "Pseudo Machine" server to the central dashboard.
  - **Global Aggregation:** Verifies that a Super Admin can fetch unified revenue and inventory metrics aggregated from all active regional servers.
  - **Fault Tolerance:** Proactively terminates a server node to verify that the rest of the network handles the offline state gracefully.

This script ensures that the decentralized architecture of CodePop remains robust and that every inter-server communication path is verified before deployment. (see [appendix 7.1](#71-automated-multi-instance-orchestration-log))

- **Steps to Reproduce:**
  1. `source codepop_virtual_enviroment/bin/activate`
  2. `python codepop_backend/integration_tests/full_p2p_automated_test.py`
- **Expected Outcome:** All 16 verification steps (Auth, Proxying, Stripe, Aggregation) return "SUCCESS", which can be verified by the final summary log in the terminal output.

### 3.2 Manual User Acceptance Tests (UAT)

- **Scenario 1: User Registration & Login**
  - **Action:** Create a user, log in, and verify JWT token receipt.
  - **Outcome:** Redirect to dashboard, user session persisted.
- **Scenario 2: Ordering a Drink**
  - **Action:** Select a soda, add add-ins, and complete "mock" checkout.
  - **Outcome:** Inventory decremented, order visible in history.
- **Scenario 3: Cross-Server Soda Discovery**
  - **Action:** Browse sodas while connected to a visiting server.
  - **Outcome:** Sodas from the home server are listed correctly via proxy.

## 4. Challenges & Areas of Concern

### 4.1 Distributed System Testing

The most significant testing challenge was verifying roaming user functionality across different server nodes. CodePop’s requirement for location-agnostic access, where a user can connect to any regional server and maintain full functionality, necessitated a complex proxying architecture rather than simple database replication. Testing this was particularly difficult because it required simulating real-time network requests between instances to ensure that local and proxied data (like user preferences and order history) were merged correctly without introducing state-mismatches.

### 4.2 Distributed User Authentication

Testing the distributed authentication system without manual intervention was a significant hurdle and served as the primary driver for our Automated Multi-Instance Orchestration suite. Automating these cross-node handshakes was the only way to ensure consistent behavior without the risk of human error.

Specifically, we encountered several technical challenges with asymmetric key (RS256) verification:

- PEM Formatting Sensitivity: We found that subtle differences in newline handling (e.g., \n vs \r\n) or trailing whitespace during database storage would cause signature verification to fail silently. To mitigate this, we had to implement a robust "key cleaning" pipeline that strips all whitespace before deriving fingerprints for the Server-Token handshake, ensuring consistent verification across different environments.
- Bootstrapping Synchronization: Managing the initial "discovery" phase—where a new server must securely register its public key with a peer before it can issue valid JWTs—required precise timing to prevent race conditions that would otherwise break the trust chain.

By creating the Multi-Instance Orchestration suite, we could verify that this integral part of the whole system worked properly, even in a production-like environment. This prevented cases where localized testing would succeed, even if the system wouldn't work in real-world scenarios.

### 4.3 Current Worries

There are several areas of concern that require more testing and refinement:

- **Edge Cases in Network Latency during P2P Discovery:** Ensuring that the system can handle a high level of latency without delaying the rest of the system startup.
- **Race Conditions in Inventory:** Ensuring the system works in cases of multiple requests for inventory changes at once.
- **Edge Cases in AI Logic:** Ensuring the AI system doesn't fulfill a request for an order that has already been fulfilled.

## 5. Code Coverage & Metrics

| Layer    | Unit Tests | Integration Tests           | Overall Coverage (Combined) |
| -------- | ---------- | --------------------------- | --------------------------- |
| Backend  | ~70%       | ~50% (Overall) / 90%+ (P2P) | ~70%                        |
| Frontend | 0%         | ~20% (API/Model Layer)      | ~20%                        |

### 5.1 Backend Coverage

We currently have around 70% overall code coverage for the backend endpoints (33 out of 47 unique paths) and core services. Our testing strategy heavily prioritized the **P2P networking and security logic**, which maintains 90%+ coverage via the `full_p2p_automated_test.py` orchestration suite. This suite simulates a multi-node network to verify RSA key exchange, token proxying, and cross-server synchronization. Standard Django unit tests in `tests.py` handle model validation and CRUD operations for the local database.

### 5.2 Frontend Coverage

Frontend coverage is currently estimated at **~20%**, focused entirely on the **API and Model layer**. We utilize a custom TypeScript test runner (`api_tests.ts`) that exercises the frontend's communication with the backend, covering authentication, order placement, and inventory retrieval. While the data-handling logic is verified, the React UI components and pages (presentation layer) currently have 0% automated unit test coverage. Manual testing serves as the primary verification for the visual and interactive elements of the application.

## 6. Final Testing Execution Plan (Draft 2: "How")

This section explains how we will run final testing before presentation. Some tests were built earlier; we will now use them as our official release checks.

### 6.1 How We Will Execute Existing Tests

- **Backend Unit/API Baseline (Django + DRF):**
  - We will run `tests.py` and `tests_p2p.py` as baseline regression tests.
  - Current baseline: **65 tests** (56 backend + 9 P2P/auth).
- **Frontend API/Model Baseline (TypeScript runner):**
  - We will run `models/tests/api_tests.ts` as the main frontend API test suite.
  - Current baseline: **73 checks** across auth, drinks/orders, inventory, chatbot, and admin/P2P routes.
- **Distributed Integration Baseline (Multi-instance orchestration):**
  - We will run `full_p2p_automated_test.py` as the final system-level gate.
  - Pass condition: all **16 orchestration steps** succeed.

### 6.2 High-Risk Areas and Expected Failure Modes

- **Distributed trust boundary (highest risk):**
  - Roaming login, refresh proxying, and logout blacklisting are most likely to fail first.
- **API response-shape drift:**
  - Some endpoints may return different object/array shapes.
- **Permission edge cases:**
  - We will verify role boundaries (including expected `403` responses).
- **Inventory update semantics:**
  - PATCH/update behavior may vary by endpoint and needs close checking.
- **Operational timing issues:**
  - Peer discovery and handshake timing may expose latency/race issues.

### 6.3 How We Will Respond to Issues

- **Authentication or P2P failures:**
  - Isolate whether the issue is token claims, key verification, or proxy routing.
  - Add a targeted regression test before closing the bug.
- **Contract/response mismatches:**
  - Align API and frontend expectations, then update assertions.
- **Permission regressions:**
  - Treat as release-blocking and rerun role-based tests.
- **Inventory/order consistency defects:**
  - Reproduce with fixed payloads, patch, and rerun backend + frontend suites.

### 6.4 Coverage Targets and Final Demo E2E Rehearsal

- **Coverage targets for final sprint validation:**
  - Backend target: about **~70%** endpoint/core coverage.
  - Frontend target: about **~20%** automated API/model coverage (UI unit coverage remains low).

#### Final Presentation: System-Level (End-to-End) Rehearsal Steps

1. **Run the automated orchestration suite**
   - Action:
     - Execute `python codepop_backend/integration_tests/full_p2p_automated_test.py` from the project root.
   - Expected outcome:
     - All checks pass and the final summary reports no failed steps.
2. **Validate roaming authentication manually**
   - Action:
     - Authenticate on a non-home server with a user whose account belongs to a different server.
   - Expected outcome:
     - Proxy login succeeds and role-based access is preserved.
3. **Validate cross-server business flows**
   - Action:
     - Perform profile, drink, and order operations during a visiting-server session.
   - Expected outcome:
     - Operations succeed and user data remains consistent across expected routes.
4. **Validate aggregation and machine proxying**
   - Action:
     - Execute super-admin aggregation routes and pseudo-machine status flows.
   - Expected outcome:
     - Aggregated metrics return correctly; degraded/offline scenarios do not crash the system.
5. **Capture final-presentation evidence**
   - Action:
     - Capture screenshots/logs during the full rehearsal run.
   - Expected outcome:
     - Evidence includes orchestration success, roaming login success, cross-server order proof, and super-admin aggregation proof.

_Screenshots are included in Appendix 7 where available; missing items will be captured during final rehearsal._

## 7. Appendices (Screenshots & Logs)

- _Include screenshots of successful test runs and system states here._

### 7.1 Automated Multi-Instance Orchestration Log

![Integration Suite](/documents/new_docs/images/integration_suite_log.png)

- [Placeholder for Screenshot: Frontend Order Confirmation]
