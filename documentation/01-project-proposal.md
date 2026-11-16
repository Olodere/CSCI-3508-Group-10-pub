# Project Subject Proposal

Complete this proposal and submit it for approval before beginning the full project.

## Submission Information

| Field | Response |
| --- | --- |
| Proposed project title | Nail Salon Appointment Scheduler |
| Group leader | Reuben Rodriguez |
| Team members | Reuben Rodriguez, Dayanara Ruvalcaba, Jayden Salgado, Yoruba Secret, Sohrab Sanjideh, Sailesh Ranjitkar |
| Date submitted | [TBD] |
| Instructor decision | [TBD] |
| Approval date | [TBD] |

## Proposed Subject

A web-based appointment scheduling system for a small, single-technician nail salon located in Aurora, Colorado. Customers will be able to browse available nail services, choose between in-salon and at-home appointments, view available appointment times, and book without creating an account. The salon owner will be able to manage services, appointments, and recurring or custom availability through an administrative interface.

## Problem and Motivation

Small, solo nail salons often book by phone or text. That is slow, easy to double-book, and awkward when the technician also travels to clients. The project is built for a real client, which gives it a practical, feasible scope while still allowing the system to potentially support other salons later.

## Proposed Software System

**Intended users:**
- **Clients** - book without an account.
- **Admin** - the salon owner, who is the single administrator and the only nail technician.

**Main capabilities:**
- Business overview with description and images
- Services with itemized prices, and custom nail requests
- In-salon or at-home appointment choice
- Open appointment slots up to 30 days ahead, with taken times blocked
- Fast booking with name and contact info, no account
- At-home bookings collect the client's address and apply a travel fee by distance/radius
- Clients can cancel their own appointment
- Secure admin login
- Admin can manage services and prices, set a default weekly schedule plus custom availability, and view and manage all appointments, client info, and the technician schedule
- No two bookings in the same slot
- Payment at the appointment

## Connection to Course Objectives

The project follows the team's development plan:
1. **Plan & design** - requirements, wireframes, data model
2. **Core booking** - services, availability, slot booking
3. **Admin & travel** - admin tools, travel fee, cancellation
4. **Test & extras** - testing; payment and notifications last

This demonstrates requirements gathering with a real client, system design, implementation, testing, version control, and teamwork across a six-person team with assigned roles:
- Point of Contact - Reuben Rodriguez
- Databases - Dayanara Ruvalcaba
- Front End - Jayden Salgado
- Full Stack - Yoruba Secret and Sohrab Sanjideh
- Security - Sailesh Ranjitkar

## Initial Scope

### In Scope

- Services, custom nail requests, and itemized pricing
- In-salon and at-home appointments
- Availability up to one month ahead
- Fast booking with no account; self-service cancellation
- Travel fee for at-home visits (radius model)
- Admin tools
- Payment at the appointment

### Out of Scope

- Online payments (later phase)
- Email/text notifications (later phase)
- Client accounts

## Expected Technology

| Area | Proposed choice | Reason |
| --- | --- | --- |
| Programming language(s) | JavaScript | [TBD] |
| Framework(s) | Next.js (frontend), Node.js (backend) | [TBD] |
| Data storage | [TBD] | [TBD] |
| Testing tools | [TBD] | [TBD] |
| Collaboration tools | GitHub, Discord | [TBD] |

## Feasibility and Risks

| Risk | Likelihood | Impact | Initial response |
| --- | --- | --- | --- |
| Custom nail requests are not yet defined (how clients describe them, whether they change price or duration, whether photos are allowed) | [TBD] | [TBD] | Confirm with the salon owner as requirements are refined |
| Travel fee model is not yet defined (flat, distance-based, or radius zones; base address; maximum radius) | [TBD] | [TBD] | Confirm with the salon owner as requirements are refined |
| Cancellation rules are not yet defined (deadline, owner notification, what the client can do after cancelling) | [TBD] | [TBD] | Confirm with the salon owner as requirements are refined |
| Scope growth from payments and notifications | [TBD] | [TBD] | Scope kept deliberately small: one technician, one admin, pay at the appointment; online payments and notifications deferred to a later phase |

## Instructor Feedback and Approval

**Feedback:** [Record instructor feedback here.]

**Required revisions:** [List revisions or enter None.]

**Approval evidence:** [Enter the approval date and describe or link to the approval message.]
