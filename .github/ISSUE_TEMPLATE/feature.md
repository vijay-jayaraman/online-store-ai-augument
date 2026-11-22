---
name: Feature
about: An issue in the format of docs/MILESTONES.md (context, tasks, acceptance and test criteria)
title: 'M<milestone>-<number> · '
labels: []
---

**Labels:** `<type>`, `<area>`, `<priority>` · **Depends on:** <M?-?? (#n) or —> · **SRS refs:** <IDs or —>

<!-- Type: feature, infra, test, docs, security. Area: api, store, admin, shared, ci, devops.
     Priority (from the SRS): must, should, could. Set the same labels and the milestone on the issue. -->

**Context:** <!-- Why this issue exists and what it delivers. -->

**Tasks**

- [ ] <!-- One concrete piece of work per checkbox. -->

**Acceptance criteria**

- <!-- Observable behaviour that must hold when the issue is done. -->

**Test criteria**

- <!-- The tests that must exist and pass before the issue is closed (unit, integration, e2e, TC-xx). -->

---

**Definition of Done**

- [ ] The pull request is reviewed and merged, and CI is green.
- [ ] All tests listed under **Test criteria** are written and pass, and coverage has not dropped below the thresholds set in M1-02.
- [ ] All new request inputs are validated with Zod schemas from `packages/shared`, and errors use the shape `{ error: { code, message, details } }`.
- [ ] New environment variables are added to `.env.example` and to the staging secrets.
- [ ] From M3 onward: the change is deployed to staging and checked manually.
- [ ] From M6 onward: every admin create, update, delete, refund, or block action writes an audit log entry (ADM-AU-01).
