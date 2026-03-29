# Agents Guide

## Purpose

This file gives future agents and developers the minimum context needed to continue work without re-deriving the project shape.

## Product Summary

Bakki is an internal ranch administration product for forestry planning and tracking. Current implementation scope is desktop and web admin only. Mobile is not being built yet, but the backend should already support later mobile task delivery, including map-highlighted task areas and YouTube-based instructions.

## Canonical Documents

- `plan.MD`: full implementation plan and architecture
- `todo.md`: canonical execution checklist
- `todo-design.md`: detailed design workstream checklist
- `todo-backend.md`: backend, Odoo Online adapter, and Bakki Core checklist
- `todo-deployment.md`: deployment checklist
- `handoff.md`: current progress, next steps, blockers, and handoff status

## Non-Negotiable Decisions

- Use Electron for the desktop app
- Use React + TypeScript + Vite for the shared frontend
- Use NestJS for the integration API
- Use Odoo Online SaaS at `bakki.odoo.com` as the Odoo system in the stack
- Use a dedicated PostgreSQL/PostGIS Bakki Core database for authoritative geometry and Bakki-specific domain data
- Use DigitalOcean for web, API, Bakki Core DB, and media hosting
- Treat the shipped Bakki UI as the current product baseline; do not preserve prototype styling unless the user explicitly asks for it
- Prototype and Figma material are legacy migration references only when a still-live surface is missing content or assets
- Use an open-source map framework and terrain-style maps
- Keep geometry validation strict
- Task instructions live on reusable task templates
- Frontend talks only to NestJS, never directly to Odoo

## Auth And Credential Rules

- Odoo Online validates credentials
- Bakki manages sessions
- Bakki does not store recoverable user passwords
- The old reveal/copy password exception is replaced by owner-triggered password reset/regenerate
- Audit every login, logout, refresh, reset, and privileged account action

## Working Rules For Agents

- Read `plan.MD` and `todo.md` before starting substantial work
- Keep implementation aligned with the fixed architecture unless the user explicitly changes it
- Do not reintroduce prototype-parity work unless the user explicitly asks for it
- Do not treat the current scope as including the mobile app
- Prefer updating the existing docs instead of creating new planning files unless necessary
- Treat `odoo/custom_addons/bakki` as legacy scaffolding unless the user explicitly changes direction again

## Context And Handoff Rule

When you estimate that about 30 percent of context remains, stop and update these files before continuing or handing off:

- `plan.MD`
- `todo.md`
- `handoff.md`

If a specialized workstream changed materially, also update:

- `todo-design.md`
- `todo-backend.md`
- `todo-deployment.md`

The goal is to onboard the next developer cleanly before context gets tight.

## What To Record In Handoff

Always capture:

- what was completed
- what is in progress
- exact next steps
- blockers or unresolved risks
- files changed
- commands or scripts introduced
- whether `plan.MD` and `todo.md` still reflect reality
