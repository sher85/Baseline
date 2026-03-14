# Analytics

## Philosophy
The analytics layer is intentionally simple, explicit, and inspectable.

The backend is the source of truth. The frontend does not compute official analytics on its own, and the AI layer consumes structured facts rather than raw wearable payloads.

## Current analytics
- rolling HRV baseline
- rolling resting heart rate baseline
- rolling sleep duration baseline
- rolling temperature baseline
- recovery score v1 with factor breakdowns
- deterministic anomaly rules

## Baselines
Current rolling windows:
- HRV: 21 days
- resting heart rate: 21 days
- sleep duration: 14 days
- temperature deviation: 21 days using median

These are intentionally personal baselines, not population norms.

## Recovery score
Recovery is computed from four signals:
- HRV delta versus baseline
- resting heart rate delta versus baseline
- sleep duration delta versus baseline
- temperature deviation versus baseline

The score is:
- deterministic
- bounded from `0` to `100`
- explanation-backed
- informative rather than clinical

## Anomaly rules
Current threshold-based anomaly rules flag:
- HRV materially below baseline
- resting heart rate elevated above baseline
- temperature deviation outside recent range
- sleep duration materially below baseline

These rules are deterministic by design. For MVP, that is a feature, not a limitation.

## Guardrails
- formulas must remain explainable
- units must be explicit in code and API responses
- scores are informative, not diagnostic
- vendor data should be transformed into app-owned semantics before analytics consume it

## What the AI sees
The AI endpoints expose:
- latest daily brief
- last-night sleep summary
- latest recovery summary
- anomaly summary
- 7-day or 30-day compact context

This allows an external agent to reason over structured analytics without direct table access and without reading raw vendor payloads.
