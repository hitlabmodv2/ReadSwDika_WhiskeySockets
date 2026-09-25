---
name: AI text provider routing
description: The provider preference for text requests and compatibility boundary for Gemini multimodal requests.
---

Keep ordinary text requests gpt-oss-first through the shared CJS wrapper. Preserve Gemini for images, tool/function data, and other requests the text provider cannot represent. Keep the CJS and ESM routing aligned so ESM callers do not silently take a different provider path.

**Why:** The user chose to keep the existing gpt-oss provider and not add credentials.

**How to apply:** When changing either wrapper, verify a real plain-text call reaches gpt-oss and mock multimodal routing to ensure it remains on Gemini. Do not add credentials or paid packages unless requested.