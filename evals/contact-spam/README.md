# Contact spam classifier evaluation

This frozen synthetic dataset protects the contact form's delivery-first policy.
It is separate from `evals/contact-qualifier`, which evaluates an optional
visitor-facing writing assistant.

The classifier receives only `intent` and `message`. It must never receive a
name, email address, IP address, or verification token. `deliver` includes both
normal delivery and delivery tagged for review. Only explicit unsolicited
advertising may resolve to `reject`.

Run the deterministic privacy and safety gate with:

```bash
node evals/contact-spam/validate.mjs
```

Remote model inference is intentionally not part of this validator. A future
candidate run should persist model results, compare them with these expected
labels, and require human approval before changing production thresholds.

