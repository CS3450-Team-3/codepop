# Final Project Report

Team SocialDrinkers (3)

## Sprint 0 Summary: Requirement Gathering

**Team Lead: Dillan**

Sprint 0 was dedicated to the initial conceptualization and foundational planning of the Codepop project. During this period, the team focused on defining the core project scope, gathering business and technical requirements, and establishing the standards for collaboration. This sprint was critical in transitioning our ideas into a structured roadmap, ensuring that every team member had a clear understanding of the project's decentralized architecture and the various user roles within the ecosystem.

### Weekly Summary

- **Ethan H.** served as the primary documentarian and repository manager. He structured the initial project documentation, created the Use Case Diagrams for all system roles, and established the backend testing protocols to ensure future code quality.

- **Ethan T.** focused on defining the core user-facing requirements, including the integrated payment system (Stripe), the logic for the AI drink recommendation engine, and ensuring cross-platform compatibility across mobile and web environments.

- **Nate** established the team's technical workflow by authoring the Git Usage Standards and Code Standards. He also managed the initial repository configuration, ensuring that the team had a consistent set of guidelines for branching, commits, and code formatting from the very start.

- **Dillan** led the sprint as Team Lead, overseeing the initial requirement gathering phase. He was responsible for drafting the project's high-level business goals and implementing the MoSCoW prioritization framework to guide the project's scope.

- **Michael** developed the comprehensive suite of User Stories that formed the basis for the system's functional requirements. He defined the specific access levels and dashboard requirements for each of the seven identified user roles, from Guest Customers to Super Admins.


---

### Work Completed

- **Project Requirements:** Finalized a comprehensive `Requirements.md` document covering business goals, functional requirements (Must/Should/Could Have), and detailed user stories.
- **System Architecture Design:** Defined the decentralized, peer-to-peer network structure and regional supply hub model.
- **Use Case Modeling:** Created detailed Use Case Diagrams for Customer Experience, Store Management, and Logistics Management to visualize system interactions.
- **Technical Standards:** Established Git usage protocols, branching strategies, and initial code formatting standards.
- **Prioritization Framework:** Implemented a MoSCoW plan to define the MVP (minimum viable product) and future feature roadmap.
- **Repository Setup:** Configured the initial repository structure, `.gitignore` rules, and environment management tools.

---

### Key Takeaways

The primary takeaway from Sprint 0 was the successful transition from abstract concepts to a concrete, documented roadmap. By establishing detailed User Stories and Use Case Diagrams early on, the team ensured a unified vision for the product's scope and stakeholder needs. Furthermore, the early adoption of Git and Code Standards laid a critical foundation for conflict-free collaboration, while the clear commitment to a decentralized P2P architecture provided the technical clarity necessary to prevent architectural drift as the project progressed into more complex development phases.

## Sprint 1 Summary: Design

**Team Lead:** Nate Washburn

## Sprint 2 Summary: Low-Level Design

**Team Lead:** Michael Seeley

### Weekly Summary

**Ethan H.** Completed 2 sections of the LLD and created our prototype to show off in the show and tell

**Ethan T.** Completed 3 sections of the LLD along with overall revisions.

**Michael** Created Diagrams for the Show and Tell and completed 2 sections of the LLD.

**Nate** Focused on the peer 2 peer network, ironing it out and improving it.

**Dillan** Completed 3 sections of the LLD, including revisions, and helped establish the peer 2 peer network idea.

---

### Work Completed

The team completed the LLD and a prototype to show off

## Sprint 3 Summary: Development

**Team Lead:** Ethan Huff

During Sprint 3 the team transitioned from design to active development. The primary objective was to establish a functional MVP by splitting the team into dedicated frontend and backend development sub-teams. This approach allowed for parallel development and specialized focus into each aspect of the project. To ensure efficiency and prevent duplication of efforts, we implemented a decentralized management style:

- **Task Management:** Major goals were decomposed into granular tasks and tracked as GitHub Issues. Team Members self-assigned the tasks between each other based on their expertise and availability.
- **Code Quality:** We established a mandatory peer-review process. Branch protection was enabled, preventing code from being pushed directly to the master branch until it had been reviewed by at least one other team member, preferably someone within the same sub-team.
- **Documentation:** Backend endpoints were documented using Swagger to provide a comprehensive view of the API endpoints and their functionalities.

### Weekly Summary

**Ethan H.** finalized the Django models to align with the Low-Level Design, developed the core REST API endpoints (including the backend JWT authentication), and integrated Swagger documentation. He also implemented the Stripe payment API and created a comprehensive Integration Testing Suite to simulate user traffic.

**Ethan T.** managed the transition of UI/UX designs from Figma into functional ReactJS components and focused on the unregistered customer flow, ensuring we had a basic layout to work upon.

**Michael** developed the Store Manager Dashboard interface and began work on the Logistics Manager views. He also began integrating these frontend views with the newly created backend endpoints.

**Nate** handled the initial frontend repository setup and project structure. He successfully implemented the robust Frontend Authentication system, including the logic for handling JWT and Refresh tokens to maintain user sessions across page reloads.

**Dillan** spent substantial time focusing on backend infrastructure, specifically the P2P database syncing logic to ensure data integrity across the network. He also led the initial effort to containerize the application using Docker.

---

### Work Completed

- **Authentication & Security:** Established a JWT-based auth system using Asymmetric RSA keys. This includes registration, login, and token refresh logic.
- **Core Backend API:** Developed the RESTful API required for the frontend to interact with the database, fully documented via Swagger.
- **Frontend Foundation:** Migrated Figma prototypes to a working React environment. Completed the initial functionality of the Home, Drink Customization, and Cart pages.
- **Database Infrastructure:** Django models were fully implemented and verified against design specs. Initial work on P2P synchronization and Docker containerization was completed.
- **Payment Integration:** Initial integration with the Stripe API for order processing and payment verification.
- **Testing Suite:** Created an Integration Testing Suite that manages headers and cookies to accurately test API responses under authenticated conditions.

---

### Incomplete Work

There still remained certain aspects that, although were goals for this sprint, had to be deferred for future sprints due to time and complexity constraints, including:

- **P2P Network Synchronization:** The logic for background syncing of the master list across the network is largely complete but requires additional edge-case testing before being merged into the master branch.

- **Stripe Webhooks & Security:** While the payment portal is functional, the server-side webhooks for payment verification and the migration of API keys to environment variables were deferred to the next sprint.

- **Managerial Dashboards:** The Store Manager and Logistics Manager views were partially implemented. The team decided to prioritize the completion of the "Customer Flow" (ordering and payment) before finalizing these internal employee tools.

- **Containerization Finalization:** Initial Docker configurations were successful, but final deployment testing across different hardware environments is still pending.

---

### Key Takeaways

The transition to a sub-team structure was highly effective. By utilizing Swagger for API documentation early in the sprint, the frontend and backend teams were able to work synchronously with minimal friction. We found that our modular design significantly reduced merge conflicts, allowing us to focus on development rather than version control issues. A major highlight was the Integration Testing Suite, which provided a reliable method for verifying our JWT authentication logic in a simulated environment.

## Sprint 4 Summary: Development

**Team Lead:** Ethan Tatton

### Weekly Summary

The team made strong progress across backend, frontend, and infrastructure, with clear ownership of tasks and consistent collaboration.

**Ethan H.** focused heavily on backend development and infrastructure. He also worked extensively on API development, server setup, and database stability, while maintaining scalability and organization across the codebase.

**Ethan T.** primarily handled frontend development. He redesigned the front page, implemented API integrations, and contributed to building out the admin interface.

**Michael** concentrated on the manager pages and their supporting API endpoints. He collaborated closely with backend work, ensuring functionality aligned between systems, and contributed to debugging and problem-solving.

**Nate** worked across both frontend and backend. He reorganized the project structure for better scalability, implemented authentication with multiple access levels, contributed to API development, and led development of the admin pages. He also supported debugging and integration efforts.

**Dillan** focused on backend systems, testing, and infrastructure. He played a major role in Dockerization, created automation scripts for server setup and testing, and worked on peer-to-peer networking and server synchronization. He also developed logistic manager pages, API endpoints, and geolocation functionality.

---

### Work Completed

The team completed a wide range of development tasks, including:

- Full implementation of registered and unregistered user functionality
- Backend API development and integration with frontend features
- Migration to Docker for consistent development environments
- Refactoring and restructuring the codebase for scalability
- Implementation of authentication and user role management
- Development of admin, manager, and logistic manager pages (partially complete)
- AI-based drink recommendation system using user data
- Peer-to-peer server architecture with synchronization
- Backend testing systems and automation scripts
- Geolocation and frontend enhancements (social features, settings, checkout)

---

### Incomplete / Ongoing Work

Some features were started but not fully completed:

- Leaderboard (started late)
- Admin page features (partially implemented)
- Manager page frontend-backend integration issues
- AI chatbot (backend partially done, frontend incomplete)

These tasks are planned to be finalized in the next sprint, which will focus on testing and stabilization.

---

### Key Takeaways

- The team demonstrated strong collaboration, especially through asynchronous communication
- Major technical milestones (Docker migration, backend stability, API completion) were successfully achieved
- Some features were too large or started too late, leading to incomplete implementation
- Better task breakdown, earlier prioritization, and improved frontend-backend coordination are needed moving forward
- Next sprint will prioritize testing, debugging, and completing near-finished features

## Sprint 5 Summary: Testing and Deployment

**Team Lead:** Dillan

Sprint 5 was the final development sprint, focused on testing, deployment, and stabilizing the application for the end-of-semester demo. The primary challenge of the sprint was standing up a true multi-store environment and verifying that all features worked correctly across simultaneously running instances. A significant portion of the sprint was spent recovering from broken frontend code that had accumulated over prior commits.
### Weekly Summary

**Ethan H.** was a primary driver of backend feature completion this sprint. He built the global revenue aggregation view for super admins, automated revenue record generation tied to order completion, and fixed order total calculation bugs. He implemented price calculation logic for drink size and add-on charges, repaired the inventory restocking flow, and added home server details and role editing to user profiles. He also did two rounds of fixes on Stripe webhook handling, audited all frontend server fetch calls to route through the proxy, and enhanced post-order confirmation with JIT tracking logic. He contributed to the User Manual and the Test Design Report documentation.

**Ethan T.** focused primarily on documentation and testing. He updated existing design documents based on feedback received and revised them to more closely reflect the features the team had actually implemented. He reviewed and edited the User Manual and assisted with bug testing when brought in directly during the final stretch of the sprint.

**Michael** contributed to the Test Design Report and reviewing/editing the User Manual. He also performed some software testing.

**Nate** handled frontend UI work throughout the sprint. He reverted several broken frontend commits to restore a clean build state, updated the sidebar with correct navigation and role-based permissions, refreshed background colors across admin and user pages for visual consistency, added a new app icon, and merged in the social pages feature. He also started the User Manual and filled out the majority of its content.

**Dillan** led the multi-store infrastructure effort. He created a `docker-compose` file that launches 9 simultaneous store instances, fixed all inter-instance routing through port 4000, and implemented P2P network info discovery. He built a server switcher UI and a locations page, added randomized seed data per store, and spent multiple days tracking down and fixing multi-store bugs. He also fixed session persistence so users stay signed in when switching stores and implemented proxying of store manager data across servers so a manager signed into any store can access their home store's information.

---

### Work Completed

- **Multi-Store Infrastructure:** Launched 9 simultaneous store instances via Docker Compose, with working inter-instance routing, P2P discovery, a server switcher UI, and randomized per-store seed data.
- **Session Persistence:** Fixed sign-in persistence across store switches and implemented cross-store authentication proxying for store managers.
- **Revenue System:** Built a global revenue aggregation view for super admins with automated revenue record generation tied to order completion and accurate reporting alongside inventory changes.
- **Stripe Webhooks:** Completed two rounds of fixes to stabilize webhook handling for payment intents and revenue records.
- **Inventory System:** Repaired the broken restocking flow and improved stock-level reporting accuracy.
- **Drink Pricing:** Implemented price calculation logic accounting for drink size and add-on charges.
- **User Management:** Added home server details to profiles, implemented admin role editing, and secured the profile editing endpoint.
- **JIT Order Tracking:** Enhanced post-order confirmation flow with Just-In-Time tracking and estimated arrival logic.
- **API Proxy Consistency:** Audited and updated all frontend server fetch calls to route through the proxy, resolving cross-origin issues.
- **Frontend UI & Sidebar:** Restored clean build state from broken commits, updated sidebar navigation with role-based permissions, refreshed page backgrounds, added a new app icon, and merged social pages.
- **Leaderboard Backend:** Merged the backend leaderboard view.
- **Documentation:** Completed the User Manual, updated the Test Design Report, and revised existing design documents to reflect the implemented system.

---

### Incomplete / Ongoing Work

- **Logistics Manager:** The scaffolding was merged and some UI was built, but the backend logic for transferring stock between stores was never fully implemented and the feature is not functional.
- **Multi-Store on Google Cloud:** Deployment to Google Cloud was attempted but took too long and was abandoned in favor of a local Docker-based demo.
- **Repair Staff View:** This feature was cut entirely and never started.

---

### Key Takeaways

- Individual components that work separately often break in weird and unsuspecting ways when brought together to make a larger piece of software.
- The authentication proxying system for multi-store sessions was architecturally sound but was only tested on the super admin account, whose elevated permissions masked a real bug in the manager flow. Testing across multiple role types from the start would have caught this earlier.
