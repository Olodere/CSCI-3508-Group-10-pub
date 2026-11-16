# Software Requirements Specification

## 1. Document Information

| Field | Value |
| --- | --- |
| Project | Nail Salon Buisness Website |
| Version | v1.0 |
| Authors | Reuben Rodriguez, Dayanara Ruvalcaba, Jayden Salgado, Yoruba Secret, Sohrab Sanjideh, Sailesh Ranjitkar |
| Last updated | [2026-10-16] |
| Status | Approved |

## 2. Purpose and Scope

**Purpose:** 
Small, solo nail salons often book by phone or text. That is slow, easy to double-book, and awkward when the technician also travels to clients. This project will create a web-based appointment scheduling system for a small, single-technician nail salon located in Aurora, Colorado. Customers will be able to browse available nail services, choose between in-salon and at-home appointments, view available appointment times, and book without creating an account. The salon owner will be able to manage services, appointments, and recurring or custom availability through an administrative interface.

**System scope:** 
- Business overview, services, custom nail requests, and itemized pricing
- In-salon and at-home appointments
- Availability up to one month (30 days) ahead
- Fast booking with no account; self-service cancellation
- Travel fee for at-home visits (radius model)
- Admin tools for services, availability, and appointments
- Payment at the appointment

## 3. Stakeholders and Users

| Stakeholder or user group | Needs | How requirements were gathered |
| --- | --- | --- |
| Client | See what the salon offers (description and images), services and itemized costs; request custom nails; see open appointments up to a month ahead; choose in-salon or at-home; book quickly without an account; cancel their own appointment | Gathered from the salon owner through the group's point of contact (Reuben Rodriguez) |
| Admin (salon owner, sole technician) | See all booked appointments and client info; manage services and prices; set default weekly times and custom availability; manage the technician schedule; manage appointments as they change | Gathered from the salon owner through the group's point of contact (Reuben Rodriguez) |

## 4. Requirements Gathering Process

**Methods used:** [Describe interviews, surveys, brainstorming, document analysis, prototypes, or other methods.]

**Participants and dates:** [Identify who participated and when.]

**Key findings:**

- There is only one nail technician, and it is the owner of the business.
- Clients should not need an account; the booking process should be fast and simple.
- Clients can choose in-salon or at-home appointments; at-home appointments outside the base address carry a travel fee.
- The owner should be able to set appointment times herself, with a default set of times each week.
- Payment happens at the appointment; online payment and email/text notifications come last.
- Custom nail requests, the travel fee model, and cancellation rules still need clarification with the owner (see Section 11).

### Elicitation Evidence Index

Preserve non-sensitive evidence such as anonymized interview notes, survey summaries, observation notes, prototype feedback, or research references.

| Evidence ID | Date | Method/source | Participants | Location or citation | Related finding/requirement |
| --- | --- | --- | --- | --- | --- |
| EL-01 | [TBD] | Project proposal document | Group 10 | `documentation\01-project-proposal.md` | Key findings above; FR-01 – FR-14 |
| EL-02 | [TBD] | Proposal presentation slides | Group 10 | [link to slides in repo] | US-01 – US-09; FR-01 – FR-14; NFR-01 – NFR-06 |

**Assumptions and constraints:**

- One technician (the owner), who is also the only admin.
- Clients never create accounts.
- Payment occurs at the appointment in v1.
- Online payments and email/text notifications are later phases.

## 5. User Stories or Use Cases

Use this format: "As a [type of user], I want [goal] so that [benefit]."

| ID | User story or use case | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| US-## | As a [user], I want [goal] so that [benefit]. | [Must/Should/Could] | Given [context], when [action], then [outcome]. |
| US-## | [Enter story] | [Priority] | [Enter measurable criteria] |
| US-01 | As a client, I want to see what the salon offers, with a description and images. | [TBD] | Given I open the site, when the home page loads, then I see the business description and images. |
| US-02 | As a client, I want to see services and itemized costs and request custom nails. | [TBD] | Given I view services, when the list loads, then each service shows its itemized price, and I can submit a custom nail request. |
| US-03 | As a client, I want to see open appointments up to a month ahead. | [TBD] | Given I pick a date, when slots load, then only open slots within 30 days are shown. |
| US-04 | As a client, I want to choose in-salon or at-home and book without an account, so that booking is fast and simple. | [TBD] | Given I chose a service and slot, when I enter my name and contact info and submit, then the booking is saved without creating an account. |
| US-05 | As a client, I want to cancel my own appointment. | [TBD] | Given I have a booking, when I cancel it, then the slot becomes available again. |
| US-06 | As the admin, I want to see all booked appointments and client info. | [TBD] | Given I am logged in, when I open appointments, then I see every booking and its client info. |
| US-07 | As the admin, I want to manage services and prices. | [TBD] | Given I am logged in, when I add, edit, or remove a service, then the change appears on the client site. |
| US-08 | As the admin, I want to set default weekly times and custom availability. | [TBD] | Given I am logged in, when I set availability, then clients see those times as open. |
| US-09 | As the admin, I want to manage the technician schedule and appointments as they change. | [TBD] | Given I am logged in, when I change an appointment, then the schedule updates. |

## 6. Functional Requirements

Each requirement must describe one testable behavior. Use "shall" for required behavior.

| ID | Requirement | Source | Priority | Acceptance measure |
| --- | --- | --- | --- | --- |
| FR-## | The system shall [perform a specific behavior]. | [Stakeholder/source] | [Must/Should/Could] | [Observable pass condition] |
| FR-01 | The system shall show a business overview with a description and images. | Slides (client #1) | [TBD] | Home page displays the description and images. |
| FR-02 | The system shall list services with itemized prices. | Slides (client #2) | [TBD] | Every service is shown with its price. |
| FR-03 | The system shall allow clients to request custom nails. | Slides (client #2); proposal | [TBD] | Pending client clarification (Section 11). |
| FR-04 | The system shall let the client choose an in-salon or at-home appointment. | Slides (client #3) | [TBD] | Both options are selectable during booking. |
| FR-05 | The system shall show open slots up to 30 days ahead and block taken times. | Slides (client #4) | [TBD] | A slot 31 days out is not shown; a booked slot disappears for other users. |
| FR-06 | The system shall allow booking with name and contact info, without an account. | Slides (client #5); proposal | [TBD] | A booking completes with no account creation. |
| FR-07 | The system shall collect the client's address for at-home appointments and apply a travel fee by distance/radius. | Slides (client #6); proposal | [TBD] | Address is required for at-home; fee model pending (Section 11). |
| FR-08 | The system shall let the client cancel their own appointment. | Slides (client #7); proposal | [TBD] | A cancelled slot becomes available again. Cancellation rules pending (Section 11). |
| FR-09 | The system shall provide a secure admin login for the owner. | Slides (admin #1) | [TBD] | Admin pages are not accessible without logging in. |
| FR-10 | The system shall let the admin add, edit, and remove services and prices. | Slides (admin #2) | [TBD] | Changes appear on the client-facing service list. |
| FR-11 | The system shall let the admin set a default weekly schedule plus custom availability. | Slides (admin #3); proposal | [TBD] | Availability set by the admin is what clients see. |
| FR-12 | The system shall let the admin view and manage all appointments, client info, and the technician schedule. | Slides (admin #4); proposal | [TBD] | Admin can see and change every appointment. |
| FR-13 | The system shall never allow two bookings in the same slot. | Slides (admin #5) | [TBD] | A second booking attempt for a taken slot is rejected. |
| FR-14 | The system shall treat payment as occurring at the appointment (no online payment in v1). | Slides (admin #6); proposal | [TBD] | No payment step exists in the booking flow. |

## 7. Non-Functional Requirements

Include relevant quality attributes such as performance, reliability, usability, security, accessibility, compatibility, scalability, and maintainability. Make each requirement measurable.

| ID | Quality attribute | Requirement | Measurement or target |
| --- | --- | --- | --- |
| NFR-## | [Performance] | The system shall [measurable expectation]. | [Target and test method] |
| NFR-## | [Reliability] | The system shall [measurable expectation]. | [Target and test method] |
| NFR-01 | Usability | The system shall be mobile-friendly, and booking shall be fast and simple. | [TBD] |
| NFR-02 | Performance | Pages and availability shall load in about 2 seconds. | ~2 seconds (initial target; may be adjusted). Test method [TBD] |
| NFR-03 | Security & Privacy | The admin area shall require authentication; client contact info and addresses shall be protected. | [TBD] |
| NFR-04 | Reliability | Availability data shall be consistent, with no double-bookings. | [TBD] |
| NFR-05 | Maintainability | Code shall be modular and documented, and services shall be easy to update. | [TBD] |
| NFR-06 | Scalability | The structure shall allow online payments and notifications to be added later. | [TBD] |

## 8. External Interface Requirements

### User Interface

Frontend built with Next.js; backend built with Node.js. Other services and integrations [TBD].

### Software Interfaces

[Describe APIs, services, libraries, file formats, and integrations.]

### Hardware or Communication Interfaces

Not applicable. The system is a web application accessed through a standard web browser on phone or computer; no special hardware is required.

## 9. Data Requirements

**Inputs from clients:** name, contact info, chosen service, appointment type (in-salon or at-home), chosen time slot, address (at-home only), custom nail request.

**Inputs from admin:** services and prices, default weekly schedule, custom availability, appointment changes.

**Privacy:** client contact info and addresses must be protected; only the admin can view client info.

**Rules:** one booking per slot; slots are shown up to 30 days ahead.

Validation and retention rules: [TBD].

## 10. Requirements Traceability Matrix

This is the project's canonical end-to-end traceability record. Update the design, implementation, and test references as work progresses; other documents should link back here rather than create a conflicting source of truth.

| Requirement ID | Design component | Implementation location | Test case(s) | Status |
| --- | --- | --- | --- | --- |
| FR-01 – FR-14 | [TBD — see system design doc] | [TBD] | [TBD] | Planned |
| NFR-01 – NFR-06 | [TBD — see system design doc] | [TBD] | [TBD] | Planned |

## 11. Requirements Change Log

| Date | Source | Change or open question | Affected IDs | Decision and reason | Approved by |
| --- | --- | --- | --- | --- | --- |
| 2026-10-16 | Proposal / slides | Open question: how clients describe custom requests; whether they change price or duration; whether photos are allowed | FR-03 | Unresolved — to confirm with owner | Pending |
| 2026-10-16 | Proposal / slides | Open question: travel fee model (flat, distance, or radius zones), base address, maximum radius | FR-07 | Unresolved — to confirm with owner | Pending |
| 2026-10-16 | Proposal / slides | Open question: cancel deadline, owner notification, what client can do after cancelling | FR-08 | Unresolved — to confirm with owner | Pending |

## 12. Review and Approval

| Reviewer | Role | Review date | Result or comments |
| --- | --- | --- | --- |
| [Enter name] | [Stakeholder/team role] | [YYYY-MM-DD] | [Approved or changes requested] |

### Requirements Quality Checklist

- [ ] Every requirement has a unique ID.
- [ ] Requirements are clear, feasible, necessary, and testable.
- [ ] Acceptance criteria are measurable.
- [ ] Functional and non-functional requirements are both included.
- [ ] Conflicts, assumptions, constraints, and scope exclusions are documented.
- [ ] Every implemented requirement maps to design, code, and one or more tests.
