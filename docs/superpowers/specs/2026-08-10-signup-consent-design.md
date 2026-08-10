# Signup Consent Interaction Design

Date: 2026-08-10
Status: approved

## Context

The Phase 2 baseline currently requires a signup user to open the privacy-consent document, scroll to the end, and confirm that review before the consent checkbox can be selected. The approved Figma capture instead presents the consent checkbox and the disclosure chevron as separate controls. Product direction now allows signup after explicit consent without requiring proof that the document was opened or scrolled to the end.

## Scope

This change covers the final profile step of `/auth/register`:

- the required consent row;
- opening and closing the consent document;
- client validation and accessibility behavior;
- affected frontend tests and Phase 2 documentation.

Backend registration validation remains unchanged. Signup must still submit `privacy_consent: true` and the currently active `privacy_policy_version`.

## Interaction Design

### Consent control

The checkbox and its label form one checkbox control. Pressing either toggles `consented` immediately and clears any consent validation error. It does not open the consent document and does not depend on a previous document-review state.

The label follows the approved Figma copy:

`이용약관 및 개인정보 처리방침 동의 (필수)`

If the active privacy-policy metadata has not loaded, the checkbox remains disabled because the client cannot submit the required policy version.

### Disclosure control

The right-aligned chevron is a separate link-like control. Pressing only this control opens the existing full consent document. The row does not display an additional `전문보기` text label.

The disclosure control has an explicit accessibility label and does not change the checkbox state.

### Document reader

The existing document content, version, effective date, and support contact remain available. Opening the document is optional. The user may close it at any scroll position through the footer close action or the platform back action. Scrolling no longer unlocks consent or controls whether the document can close.

### Submission

`가입하기` continues to validate every required profile field. An unchecked consent control produces the existing required-consent error. A checked control may proceed without opening the document. Server-side consent and policy-version checks remain authoritative.

## State and Error Handling

- Policy metadata loading failure keeps consent unavailable and preserves the existing explanatory error.
- Toggling consent clears only the consent validation error.
- Opening or closing the document never changes consent.
- A server `PRIVACY_POLICY_VERSION_MISMATCH` response clears consent, refreshes registration options, and requires the user to explicitly check the updated version again.

## Tests

Frontend regression coverage will assert that:

- the checkbox invokes only the consent toggle;
- the chevron invokes only document opening;
- consent does not require a `privacyReviewed` or `privacyReadToEnd` state;
- the document can close without reaching the end;
- the Figma consent copy and chevron-only disclosure are rendered;
- registration still requires `consented` and the active policy metadata.

The related frontend test file, full frontend test suite, TypeScript typecheck, and lint must pass before the implementation commit is created.

## Documentation Decision

`docs/phase2/FRONTEND_ROUTE_SPEC.md` and `CODEX.md` will be updated to replace the previous scroll-to-end gate with this explicit-but-independent consent interaction. This is an intentional product decision, not an accidental relaxation of backend validation.

## Out of Scope

- changing the backend consent schema or stored audit fields;
- making consent optional;
- changing the legal document text;
- changing account settings or My Page legal screens.
