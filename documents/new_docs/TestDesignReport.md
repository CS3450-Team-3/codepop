# Test Design Report: CodePop

## 1. Introduction: Testing Journey & Mindset

_This section narrates the team's overall approach and philosophy toward ensuring CodePop's reliability._

- **Our Philosophy:** (e.g., "Prevention over cure," "Focus on critical paths like P2P sync and Authentication")
- **The Journey:** How the testing strategy evolved from simple unit tests to complex multi-instance orchestration.
- **Goals:** What we define as a "successful" test suite (e.g., 100% pass rate on core logic, resilient P2P discovery).

## 2. Testing Approach (Draft 1: "How")

_How we intend to carry out our tests during the development and testing sprints._

### 2.1 Backend Unit & API Testing

- **Framework:** Django `unittest` and `REST Framework APITestCase`.
- **Scope:**
  - Model validation (Inventory, Orders, Users).
  - API endpoint security and data integrity.
  - JWT claim verification.
- **Automation:** Integrated into the development workflow to catch regressions early.

### 2.2 Peer-to-Peer (P2P) Logic Verification

- **Strategy:** Using mocks to simulate network traffic for fast logic verification.
- **Key Focus:**
  - RS256 asymmetric signature validation.
  - Peer discovery and public key exchange logic.
  - JWT proxy authentication.

### 2.3 Frontend API & Integration Testing

- **Framework:** Custom TypeScript Test Runner (`api_tests.ts`).
- **Strategy:** End-to-end API verification from the frontend's perspective.
- **Scope:**
  - Authentication flows (Login, Register, Profile Management).
  - Business logic (Drink creation, Ordering, Inventory management).
  - Cross-cutting features (Chatbot, Notifications, Revenue).
  - Admin/P2P controls (Server discovery, Master list access).
- **Automation:** Can be executed via `npx ts-node models/tests/api_tests.ts` to verify frontend-to-backend compatibility.

## 3. System-Level (End-to-End) Testing

_Ensuring the entire application works together before the final presentation._

### 3.1 Automated Multi-Instance Orchestration

- **The "Full P2P Automated Test":** Describe the script that spins up two PostgreSQL databases and two Django servers to test real cross-server authentication.
- **Steps to Reproduce:**
  1. `source codepop_virtual_enviroment/bin/activate`
  2. `python codepop_backend/integration_tests/full_p2p_automated_test.py`
- **Expected Outcome:** Servers A and B exchange keys, and a user from A can log in via B.

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

_Parts of the app that are/were especially challenging to test._

- **Distributed State:** Ensuring consistency across multiple decentralized servers.
- **Asymmetric Encryption:** Debugging RSA keypair mismatches across different environments.
- **Stripe Integration:** Testing payment flows without processing real transactions (using Stripe Test Mode and Mock Stripe API).
- **Frontend/Backend Integration:** Handling async state updates in React when the backend is proxying requests.
- **Current Worries:** (e.g., "Edge cases in network latency during P2P discovery," "Race conditions in inventory updates").

## 5. Code Coverage & Metrics

- **Current Estimated Coverage:** (e.g., 75% for Backend Core, 90% for P2P Logic).
- **Tooling:** (Mention `coverage.py` if used, or how you calculated the estimate).

## 6. Testing Sprint Results (Draft 2: "What")

_To be completed at the end of the testing sprint._

### 6.1 What We Tested

- Summary of the final test execution run.
- Any new tests added during the testing sprint.

### 6.2 What We Learned

- **Bugs Uncovered:** List key issues found (e.g., "Found a bug where public keys weren't refreshing after a server restart").
- **Performance Insights:** (e.g., "P2P handshake adds ~200ms latency on first request").

### 6.3 What We Fixed

- Description of the fixes implemented as a result of the testing phase.

## 7. Appendices (Screenshots & Logs)

- _Include screenshots of successful test runs and system states here._
- [Placeholder for Screenshot: Automated Test Success]
- [Placeholder for Screenshot: Frontend Order Confirmation]
