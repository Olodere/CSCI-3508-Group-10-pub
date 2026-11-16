# System Design

## 1. Design Overview

**Project:** Nail Salon Appointment Scheduler

**Design goals:**
- **Simple, fast booking** - clients book without an account, and the site must be mobile-friendly (FR-06, NFR-01).
- **Reliable availability** - clients only see open times, and no slot can be booked twice (FR-05, FR-13, NFR-04).
- **Owner control** - services, prices, and availability are managed by the owner through an admin interface, not code changes (FR-10, FR-11, NFR-05).
- **Room to grow** - online payments and notifications can be added in a later phase without restructuring (NFR-06).

**Constraints:**
- One technician (the owner), who is also the only admin.
- Clients never create accounts.
- Payment occurs at the appointment in v1; online payments and email/text notifications are later phases.
- Frontend built with Next.js; backend built with Node.js.
- Bookable availability is limited to 30 days ahead.
- Custom requests, the travel fee model, and cancellation rules are pending client confirmation (see `02-requirements-specification.md`, Section 11).

Store editable diagram sources and readable exported images in `design-assets/`. Use relative links so diagrams display from a fresh repository copy.

## 2. Architecture

### Architecture Style

The system uses a **three-tier client-server architecture**: a Next.js frontend (presentation), a Node.js backend (application logic), and a database (data storage). Clients and the admin reach the frontend through a browser, and the frontend sends requests to the backend, which reads and writes the database. The frontend never talks to the database directly, so booking rules such as blocking taken slots (FR-13) and protecting client info (NFR-03) are enforced in one place on the server. Internal backend structure: [TBD - backend team].

### Architecture Diagram

> **Figure 1 - System Architecture** *(in progress - Sailesh Ranjitkar)*
> Final diagram should be saved as `design-assets/sys-arch.png`.

**Diagram explanation:** *(to be written once Figure 1 is finalized - Sailesh Ranjitkar / Jayden Salgado)*

| Component | Responsibility | Inputs | Outputs | Related requirements |
| --- | --- | --- | --- | --- |
| Next.js frontend | Renders all client pages (overview, services, booking flow, confirmation, cancellation) and admin pages (login, appointments, services, availability) | User actions in the browser; data returned by the backend | Rendered pages; requests to the backend | FR-01 - FR-12, NFR-01, NFR-02 |
| Node.js backend | [TBD - backend team] | Requests from the frontend | Responses to the frontend | [TBD] |
| Database | [TBD - Yoruba] | [TBD] | [TBD] | [TBD] |

## 3. UML Diagrams

Use the UML diagram types that accurately communicate your system. At minimum, include diagrams needed to explain user interactions, static structure, and important behavior. Label every diagram and keep it consistent with the code.

### 3.1 Use Case Diagram

> [Insert a use case diagram showing actors, system boundary, and major use cases.]

**Explanation:** There are two actors. The **Client** can view the business overview, view services and itemized prices, request custom nails, view open appointment slots, book an appointment (choosing in-salon or at-home), and cancel their own appointment. An at-home booking includes entering an address and applying a travel fee. The **Admin** (salon owner) can log in, manage services and prices, set the default weekly schedule and custom availability, and view and manage all appointments and client info. Logging in is required before any admin use case.

### 3.2 Class or Domain Model Diagram

> [Insert a class or domain model showing names, key attributes/operations, relationships, and multiplicities.]

**Explanation:** The main entities are:
- **Service** - a nail service with a description and itemized price.
- **Availability** - the owner's default weekly schedule plus any custom availability; together these produce the appointment slots clients can book.
- **Appointment** - one booking: the chosen service, the slot, the appointment type (in-salon or at-home), the client's name and contact info, the address (at-home only), any custom nail request, and its status (booked or cancelled).
- **Admin** - the salon owner's login.

Clients have no accounts, so client info is stored on the Appointment rather than as a separate user record. One Service can appear in many Appointments. Each slot can hold at most one active Appointment (FR-13).

### 3.3 Sequence Diagram(s)

> [Insert at least one sequence diagram for a major scenario or complex interaction.]

**Scenario:** 

**Use case:** Book an appointment (US-04).

**Successful flow:**
1. Client views the business overview and services with itemized prices.
2. Client chooses in-salon or at-home.
3. Frontend requests open slots for the next 30 days; backend returns them.
4. Client picks a slot and enters name and contact info (plus address if at-home, with the travel fee applied).
5. Frontend sends the booking to the backend.
6. Backend confirms the slot is still open and saves the appointment.
7. Frontend shows the confirmation; payment happens at the appointment.

**Alternate flow:** if another client booked the same slot first, the backend rejects the booking and the client is returned to pick another time.

### 3.4 Additional Diagram(s)

> [Insert an activity, state, deployment, package, or other diagram if it helps explain the system. Otherwise explain why no additional diagram is necessary.]

## 4. Data and Schema Design

### Data Model or Schema Diagram

> [Insert an entity-relationship diagram, database schema, file schema, or object model. If the project stores no data, explain why this section is not applicable.]

| Entity/table/object | Important fields and types | Key or identifier | Relationships and constraints |
| --- | --- | --- | --- |
| [Name] | [field: type] | [Primary key/ID] | [Relationships, validation, uniqueness] |

**Data integrity and privacy:** [Explain validation, error prevention, sensitive data handling, and retention where relevant.]

## 5. Interface Design

### User Interface

> [Insert wireframes, mockups, navigation map, or screenshots with figure numbers.]

**Client pages:**
- **Home (`/`)** - business overview with description and images, and the list of services with itemized prices (FR-01, FR-02).
- **Booking (`/book`)** - a step-by-step flow matching the proposal: choose service (with optional custom request), choose in-salon or at-home, pick an open time within 30 days, enter contact info (and address with travel fee if at-home), then confirm (FR-03 - FR-07).
- **Confirmation (`/confirm`)** - booking summary; notes that payment is at the appointment (FR-14).
- **Cancel** - lets the client cancel their own appointment (FR-08). How the client reaches this page depends on the cancellation rules still being confirmed.

**Admin pages** (login required, FR-09):
- **Login (`/admin/login`)**
- **Appointments (`/admin/appointments`)** - all bookings with client info (FR-12)
- **Services (`/admin/services`)** - add, edit, remove services and prices (FR-10)
- **Availability (`/admin/availability`)** - default weekly schedule and custom availability (FR-11)

**Usability:** the layout is designed mobile-first so booking works on a phone (NFR-01). The booking flow shows one step at a time so it stays fast and simple, and only fields relevant to the chosen appointment type are shown (the address appears only for at-home).

### Internal and External Interfaces

| Interface | Producer | Consumer | Data/contract | Error handling |
| --- | --- | --- | --- | --- |
| Get services | Backend | Frontend (Home, Booking) | Returns services with descriptions and prices. Contract [TBD] | [TBD] |
| Get open slots | Backend | Frontend (Booking) | Returns open slots within 30 days. Contract [TBD] | [TBD] |
| Create booking | Backend | Frontend (Booking) | Sends service, slot, type, contact info, address (at-home), custom request. Contract [TBD] | Slot already taken → client returned to pick another time |
| Cancel booking | Backend | Frontend (Cancel) | Contract [TBD] | [TBD] |
| Admin login | Backend | Frontend (Admin login) | Contract [TBD] | Invalid login → error message, no access |
| Admin manage services / availability / appointments | Backend | Frontend (Admin pages) | Contract [TBD] | Not logged in → no access |

## 6. Key Algorithms and Logic

**Open slot calculation (FR-05, FR-11):**
1. Start from the owner's default weekly schedule.
2. Apply any custom availability the owner has set.
3. Remove slots that already have an active booking.
4. Return only slots from today through 30 days ahead.

**Booking (FR-06, FR-13):**
1. Check required fields are present (name, contact info; address if at-home).
2. Re-check that the chosen slot is still open at the moment of booking.
3. If it is open, save the appointment; the slot no longer appears to other clients.
4. If it was taken, reject the booking and return the client to pick another time.

**Cancellation (FR-08):** the appointment is marked cancelled and its slot becomes available again. Deadline and notification rules are pending client confirmation.

**Travel fee (FR-07):** applied to at-home appointments based on distance/radius from the base address. The exact model is pending client confirmation.

## 7. Security and Reliability

[Explain relevant authentication, authorization, input validation, error handling, backups, fault tolerance, logging, or recovery decisions. Mark non-applicable items and explain why.]

## 8. Design Decisions and Alternatives

| Decision | Alternatives considered | Chosen approach and reason | Tradeoffs |
| --- | --- | --- | --- |
| No client accounts | [TBD] | Clients book with name and contact info only, because booking should be fast and simple (proposal) | Clients need another way to find their booking to cancel it [TBD - depends on cancellation rules] |
| Payment at the appointment in v1 | Online payment in advance | Keeps v1 scope small; online payment planned for a later phase | No payment collected online in v1 |
| Defer email/text notifications | Notifications in v1 | Placed last on the functionality list to keep scope realistic | Clients get no automatic reminders in v1 |
| Next.js frontend, Node.js backend | [TBD] | [TBD] | [TBD] |
| Overall architecture style | [TBD] | Three-tier client-server; backend structure [TBD - backend team] | [TBD] |

## 9. Requirements-to-Design Mapping

Keep the full traceability record in `02-requirements-specification.md`. Use this table only to explain design-specific details.

| Requirement ID(s) | Design element | How the design satisfies the requirement |
| --- | --- | --- |
| FR-01, FR-02 | Home page; Get services interface | Overview and service list with prices are rendered from data returned by the backend |
| FR-03 - FR-07 | Booking page; Get open slots and Create booking interfaces; open slot calculation (Section 6) | Step-by-step booking flow collects service, type, slot, contact info, and address; backend validates and saves |
| FR-08 | Cancel page; Cancel booking interface | Appointment marked cancelled; slot reopens |
| FR-09 | Admin login page; backend login check | Admin pages require login |
| FR-10 - FR-12 | Admin pages; admin interfaces | Owner manages services, availability, and appointments without code changes |
| FR-13, NFR-04 | Booking logic (Section 6); database constraints (Section 4) | Slot re-checked at booking time; a taken slot is rejected |
| FR-14 | Confirmation page | No payment step; confirmation states payment is at the appointment |
| NFR-01 | Mobile-first UI (Section 5) | Pages designed for phone screens first |
| NFR-03 | Backend as the only path to the database (Section 2) | Client info only reachable through the backend |

## 10. Design Review Checklist

- [ ] Architecture, UML diagrams, and schema are complete and readable.
- [ ] Diagram notation, labels, directions, and multiplicities are accurate.
- [ ] Every major requirement is represented in the design.
- [ ] Diagram names and relationships match the implementation.
- [ ] Interfaces, data validation, errors, and important quality attributes are addressed.
- [ ] Design choices and tradeoffs are justified.
