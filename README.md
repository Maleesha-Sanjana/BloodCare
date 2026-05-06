# 🩸 BloodCare — Blood Donation Management System Sri Lanka

A web-based Blood Donation Management System designed for Sri Lanka to connect blood donors with hospitals and patients. Built with pure HTML, CSS, and JavaScript.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [System Functions](#system-functions)
- [Language Support](#language-support)
- [Team](#team)

---

## Overview

Blood donation is essential for saving lives during medical emergencies such as accidents, surgeries, and serious illnesses. Current blood donation processes in Sri Lanka rely on manual donor records and social media requests, causing critical delays.

This system solves that by providing a centralized digital platform where:
- Donors can register and be found quickly
- Hospitals can post urgent blood requests
- Patients can locate compatible donors by blood group and district
- Everyone receives real-time alerts and notifications

---

## Features

- **Donor Registration** — Register with name, age, blood group, contact number, and district
- **Blood Group Search** — Search donors by blood type and location across all 25 Sri Lanka districts
- **Donation Requests** — Hospitals post requests with emergency level (Critical / Urgent / Normal)
- **Notification Center** — Alerts for emergency requests, donation reminders, and hospital updates
- **Quick Blood Search** — One-click search buttons for all 8 blood groups
- **Tri-Lingual Support** — Full UI in English, Sinhala (සිංහල), and Tamil (தமிழ்)
- **Persistent Storage** — All data saved in browser `localStorage`
- **Responsive Design** — Works on desktop, tablet, and mobile

---

## Tech Stack

| Layer      | Technology          |
|------------|---------------------|
| Markup     | HTML5               |
| Styling    | CSS3 (custom, no frameworks) |
| i18n       | Custom translation engine |

---

## System Functions

### Donor Registration
Donors provide: Name · Age · Blood Group · Contact Number · District · Email (optional)

### Blood Group Search
Filter donors by blood group and/or district. Results show donor cards with a contact modal.

### Donation Requests
Hospitals submit requests including:
- Blood group required
- Hospital name and location
- Contact number
- Emergency level (Critical 🔴 / Urgent 🟠 / Normal 🟢)
- Units required

### Notification Center
Automatically populated when:
- A new donor registers
- A hospital posts a blood request
- Donation reminders are triggered

Notifications are filterable by type and individually dismissable.

---

## Language Support

The system supports three languages to serve all communities in Sri Lanka:

| Language | Code | Purpose |
|----------|------|---------|
| English  | `en` | Default — hospitals, professionals |
| Sinhala  | `si` | Sinhala-speaking communities |
| Tamil    | `ta` | Tamil-speaking communities |

Switch languages using the **EN / සිං / தமி** buttons in the top navigation bar.

---

## Team

Presented by:

- **Maleesha Sanjana**
- **Randini Gunasekara**
- **Denuka Jayasunadara**
- **Anjalika Wickramasinghe**

**Institution:** CINEC Campus  
**Module:** Software Project Management  
**Date:** March 2026

---

*BloodCare — Saving lives through technology, Sri Lanka* 🩸
