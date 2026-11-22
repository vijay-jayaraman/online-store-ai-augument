<!-- Title: start with the issue ID, e.g. "M5-02 · Google sign-in" (Dependabot PRs are exempt).
     One issue per pull request; it is squash-merged into main once all required checks pass. -->

## Summary

<!-- What changed and why. -->

Closes #

## Verification

<!-- What you ran and checked: tests, manual steps, screenshots. -->

## Definition of Done

<!-- From docs/MILESTONES.md §1.3. "Reviewed" means the author's own review (no approval is required). -->

- [ ] The pull request is reviewed and merged, and CI is green.
- [ ] All tests listed under **Test criteria** are written and pass, and coverage has not dropped below the thresholds set in M1-02.
- [ ] All new request inputs are validated with Zod schemas from `packages/shared`, and errors use the shape `{ error: { code, message, details } }`.
- [ ] New environment variables are added to `.env.example` and to the staging secrets.
- [ ] From M3 onward: the change is deployed to staging and checked manually.
- [ ] From M6 onward: every admin create, update, delete, refund, or block action writes an audit log entry (ADM-AU-01).
