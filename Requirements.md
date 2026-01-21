# Purpose

The purpose of this document is to define the functional, non-functional, business, and user requirements for the Codepop application. Codepop is an automated beverage fulfillment ecosystem designed to minimize human labor while still upholding maximum customer satisfaction. This document serves to provide the scope for the system's capabilities.

# Scope

The Codepop ecosystem is comprised of a customer-facing mobile and web application for ordering, a comprehensive system for inventory and logistics management, and a machine interface for tracking the status of automated robotic drink dispensers. The system manages the flow between customers, store managers, logistic coordinators, and repair staff to ensure "Just-In-Time" drink fulfillment and efficient supply chain operations.

# Definitions & Acronyms

Supply Hub:

- A central warehouse facility responsible for distributing inventory to stores within its region and neighboring regions within 1000 miles.

Region:

- A collection of stores in a large geographical area.

Micro-Region:

- A subdivision of a geographic region used to optimize repair staff travel and stock transfers.

# User Classes and Characteristics

To ensure the system meets the needs of all users, we have identified the following user classes and characteristics:

### Guest Customer

A transient user who interacts with the system for immediate needs without long-term commitment.

- **Characteristics:**
  - Wishes to use the system without retaining personal data.
  - Values a frictionless and speedy ordering process.
- **Limitations:**
  - Data and preferences are not saved after the session ends.
  - Will not have access to advanced personalized AI features (e.g., preference-based drink generation).

### Registered Customer

A recurring user who creates an account to enhance their ordering experience through data persistence.

- **Characteristics:**
  - Values convenience features such as saving favorite drink recipes and payment methods.
  - Utilizes the Codepop Drink Generator AI for personalized recommendations.
- **System Interaction:**
  - The system automatically suggests the optimal store location based on the user's current GPS location.
  - Order history and preferences are synchronized across all regions.

### Store Manager

The operational lead responsible for a specific physical location. They ensure the day-to-day efficiency of the store.

- **Responsibilities:**
  - Monitors local inventory levels (syrups, cups, ice, CO2).
  - Tracks store revenue and financial reporting.
  - Monitors immediate machine status and alerts.
- **Access Control:**
  - Strictly limited to the information of their own assigned store; cannot view data from other locations.

### Logistics Manager

A high-level administrator responsible for the supply chain and inventory flow across multiple regions and Supply Hubs.

- **Responsibilities:**
  - Manages "Supply Hubs" and authorizes stock transfers between stores and hubs.
  - Assigns tasks and routes to **Repair Staff**.
  - Analyzes supply usage patterns to optimize restocking.
- **Access:**
  - **Region Stock:** View specific store stock within their region.
  - **Hub Stock:** View inventory levels in regional Supply Hubs.
  - **Proximity Stock:** View stock availability in regions within 1000 miles for emergency sourcing.
  - **Sales Data:** Access aggregated store sales data to inform logistics decisions.

### Repair Staff

Technical staff tasked with maintaining robotic drink dispensers to minimize store downtime. They operate primarily in the field based on automated or assigned tickets.

- **Responsibilities:**
  - Ensures maintenance is completed in a timely manner.
  - Responds to machine status alerts (e.g., "error", "service upcoming").
- **Information Access:**
  - Receives detailed store information (Address, Contact).
  - View machine specifics: Machine Type, Operational Start Date.
  - View real-time logs: Machine Status (e.g., "Repair-Start", "Normal"), Status Date.

### Admin (Local)

A store-level administrator with elevated permissions compared to the standard Store Manager.

- **Access:**
  - Includes all access rights of a **Store Manager** (Stock, Revenue, Machine Status).
- **User Management:**
  - Ability to manage local user accounts (e.g., adding or removing Store Managers).
  - Can update/unlock user accounts for their specific location.

### Super Admin

The highest level of system access, responsible for the global configuration of the decentralized network.

- **Responsibilities:**
  - Manages global security settings and system configurations.
  - Oversees all user accounts system-wide.
- **Network Control:**
  - Can create or delete Supply Hubs and Regions.
  - Has unrestricted read/write access to data at any store location or Supply Hub.

# Business Requirements

These requirements define high-level business goals

1. Scalability via Decentralization
   - The architecture must be optimized to allow easy expansion from a single store to multiple locations, being organized into regions and sub-regions.
   - The software must operate without a single centralized master server. Instead local stores must communicate with each other and synchronize peer-to-peer or with their regional hub only when necessary.
2. Automation and Minimal Human Interaction:
   - The system must enable stores to run without the interference of human operators, with minimal visits by store staff, relying instead of robotic fulfillment.
3. Supply Chain Optimization
   - The system must reduce waste and stockouts by utilizing the 7 designated supply hubs
   - Inventory logic must prioritize shipping from the closest valid source _(Local Store > Regional Hub > Neighboring Hub < 1000 miles)_.
   - The 7 hubs are as listed:
     1. **Region A:** Chicago, IL
     2. **Region B:** New Jersey, NY
     3. **Region C:** Logan, UT
     4. **Region D:** Dallas, TX
     5. **Region E:** Atlanta, GA
     6. **Region F:** Phoenix, AZ
     7. **Region G:** Boise, ID
4. Maintenance Efficiency
   - To maximize system uptime and profits, the system must transition from a reactive to a proactive maintenance schedule. Repair staff travel should be minimized using specialized algorithms.
5. Regulatory and Reporting Compliance
   - Each location must maintain independent revenue tracking. Global reporting must be aggregable by Super Admins without compromising the decentralized nature of the network.

## Must Have

### Region Management

- Stores will belong and act within a region
- Each Region will have a supply hub
- Supplies can come from supply hub, local suppliers, stores within region, and regions within 1000 miles

### Store Info

- Communicate directly with other stores inside of their region
- Own stock quantity

- Sales data

### Machine Management

- Keep track of maintnence schedule

- Keep track of machine type

- Keep track of machine status
  - running

  - repair-start

  - repair-end

  - error

  - critical error

  - out of order

  - service upcoming

- Keep track of when the status is applied/changed

- Keep track of how long until machine is inoperable

- Keep track of repair staff location/status

### Universal Drink ordering system

- Drinks are universal in their makeup
  - a small is x oz, medium is y oz, and a large is z oz

  - syrup is quantized to a squirt (cant order a half squirt)

  - Ingredients share the same name everywhere

- an order can contain many drinks

- each drink does not have to fill the entire volume

- ingredients added in different order are the same (mtn dew, lime, lemon is the same as lemon, mtn dew, lime)

- ingredients combine if added out of order (1 lemon, 1 lime, 1 lemon -> 2 lemon, 1 lime)

## Should Have

### Regions

- Contain Micro Regions
  - Micro regions will allow for repair staff to move around more efficiently

  - Micro regions will NOT have impenetrable borders

### Stores

- Store specific drinks

- Drinks in the order queue (ordered but not yet made)

- organise other stores between micro and main region

- upcoming maintenance schedule

- total storage availability (can store 100 lbs of syrup, 30 different flavors, etc)

- minimum stock before re-order

- minimum stock required to allow transfer to other store

- maximum stock of items

### Logistic Manager

- Adjust minimum stock quantities to have on hand inside the supply hub

- access all store stock info
  - minimum/maximum

  - minimum stock to allow transfers

### Manager

- set store minimum/maximum stock

- set store minimum allow to transfer value

- request stock from other stores

- deny stock transfer requests

## Could Have

### Stock

- stock organized within micro regions so stock transfers are faster

- predictive ordering based off of sales data

- new suggested minimums based off of sales data

## Will not have

- The ability for multiple users to use the same account
- A gift card or cash processing system (all types of payment will be processed using Stripe)
