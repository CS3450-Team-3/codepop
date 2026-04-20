# Sprint 0 Summary: Requirement Gathering

**Team Lead: Dillan**

# Sprint 1 Summary: Design

**Team Lead:** Nate Washburn

# Sprint 2 Summary: Low-Level Design

**Team Lead:** Michael Seeley

## Weekly Summary

**Ethan H.** Completed 2 sections of the LLD and created our prototype to show off in the show and tell

**Ethan T.** Completed 3 sections of the LLD along with overall revisions.

**Michael** Created Diagrams for the Show and Tell and completed 2 sections of the LLD.

**Nate** Focused on the peer 2 peer network, ironing it out and improving it.

**Dillan** Completed 3 sections of the LLD, including revisions, and helped establish the peer 2 peer network idea.

---

## Work Completed

The team completed the LLD and a prototype to show off

# Sprint 3 Summary: Development

**Team Lead:** Ethan Huff

During Sprint 3 the team transitioned from design to active development. The primary objective was to establish a functional MVP (minimum viable product) by splitting the team into dedicated frontend and backend development sub-teams. This approach allowed for parallel development and specialized focus into each aspect of the project. To ensure efficiency and prevent duplication of efforts, we implemented a decentralized management style:

- **Task Management:** Major goals were decomposed into granular tasks and tracked as GitHub Issues. Team Members self-assigned the tasks between each other based on their expertise and availability.
- **Code Quality:** We established a mandatory peer-review process. Branch protection was enabled, preventing code from being pushed directly to the master branch until it had been reviewed by at least one other team member, preferably someone within the same sub-team.
- **Documentation:** Backend endpoints were documented using Swagger to provide a comprehensive view of the API endpoints and their functionalities.

## Weekly Summary

**Ethan H.** finalized the Django models to align with the Low-Level Design, developed the core REST API endpoints (including the backend JWT authentication), and integrated Swagger documentation. He also implemented the Stripe payment API and created a comprehensive Integration Testing Suite to simulate user traffic.

**Ethan T.** managed the transition of UI/UX designs from Figma into functional ReactJS components and focused on the unregistered customer flow, ensuring we had a basic layout to work upon.

**Michael** developed the Store Manager Dashboard interface and began work on the Logistics Manager views. He also began integrating these frontend views with the newly created backend endpoints.

**Nate** handled the initial frontend repository setup and project structure. He successfully implemented the robust Frontend Authentication system, including the logic for handling JWT and Refresh tokens to maintain user sessions across page reloads.

**Dillan** spent substantial time focusing on backend infrastructure, specifically the P2P database syncing logic to ensure data integrity across the network. He also led the initial effort to containerize the application using Docker.

## Work Completed

- **Authentication & Security:** Established a JWT-based auth system using Asymmetric RSA keys. This includes registration, login, and token refresh logic.
- **Core Backend API:** Developed the RESTful API required for the frontend to interact with the database, fully documented via Swagger.
- **Frontend Foundation:** Migrated Figma prototypes to a working React environment. Completed the initial functionality of the Home, Drink Customization, and Cart pages.
- **Database Infrastructure:** Django models were fully implemented and verified against design specs. Initial work on P2P synchronization and Docker containerization was completed.
- **Payment Integration:** Initial integration with the Stripe API for order processing and payment verification.
- **Testing Suite:** Created an Integration Testing Suite that manages headers and cookies to accurately test API responses under authenticated conditions.

## Incomplete Work

There still remained certain aspects that, although were goals for this sprint, had to be deferred for future sprints due to time and complexity constraints, including:

- **P2P Network Synchronization:** The logic for background syncing of the master list across the network is largely complete but requires additional edge-case testing before being merged into the master branch.

- **Stripe Webhooks & Security:** While the payment portal is functional, the server-side webhooks for payment verification and the migration of API keys to environment variables were deferred to the next sprint.

- **Managerial Dashboards:** The Store Manager and Logistics Manager views were partially implemented. The team decided to prioritize the completion of the "Customer Flow" (ordering and payment) before finalizing these internal employee tools.

- **Containerization Finalization:** Initial Docker configurations were successful, but final deployment testing across different hardware environments is still pending.

## Key Takeaways

The transition to a sub-team structure was highly effective. By utilizing Swagger for API documentation early in the sprint, the frontend and backend teams were able to work synchronously with minimal friction. We found that our modular design significantly reduced merge conflicts, allowing us to focus on development rather than version control issues. A major highlight was the Integration Testing Suite, which provided a reliable method for verifying our JWT authentication logic in a simulated environment.

# Sprint 4 Summary: Development

**Team Lead:** Ethan Tatton

## Weekly Summary

The team made strong progress across backend, frontend, and infrastructure, with clear ownership of tasks and consistent collaboration.

**Ethan H.** focused heavily on backend development and infrastructure. He also worked extensively on API development, server setup, and database stability, while maintaining scalability and organization across the codebase.

**Ethan T.** primarily handled frontend development. He redesigned the front page, implemented API integrations, and contributed to building out the admin interface.

**Michael** concentrated on the manager pages and their supporting API endpoints. He collaborated closely with backend work, ensuring functionality aligned between systems, and contributed to debugging and problem-solving.

**Nate** worked across both frontend and backend. He reorganized the project structure for better scalability, implemented authentication with multiple access levels, contributed to API development, and led development of the admin pages. He also supported debugging and integration efforts.

**Dillan** focused on backend systems, testing, and infrastructure. He played a major role in Dockerization, created automation scripts for server setup and testing, and worked on peer-to-peer networking and server synchronization. He also developed logistic manager pages, API endpoints, and geolocation functionality.

---

## Work Completed

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

## Incomplete / Ongoing Work

Some features were started but not fully completed:

- Leaderboard (started late)
- Admin page features (partially implemented)
- Manager page frontend-backend integration issues
- AI chatbot (backend partially done, frontend incomplete)

These tasks are planned to be finalized in the next sprint, which will focus on testing and stabilization.

---

## Key Takeaways

- The team demonstrated strong collaboration, especially through asynchronous communication
- Major technical milestones (Docker migration, backend stability, API completion) were successfully achieved
- Some features were too large or started too late, leading to incomplete implementation
- Better task breakdown, earlier prioritization, and improved frontend-backend coordination are needed moving forward
- Next sprint will prioritize testing, debugging, and completing near-finished features

# Sprint 5 Summary: Testing and Deployment

**Team Lead:** Dillan

# Sprint 6 Summary: Maintenance

**Team Lead:** Dillan
