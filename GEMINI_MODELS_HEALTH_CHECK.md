# Gemini Models Health Check Report

**Date**: 2026-02-14T04:44:28.273Z

**API Keys Tested**: 3

---

## Summary

| Model | Status | Working Keys | Failed Keys |
|-------|--------|--------------|-------------|
| `gemini-2.0-flash-exp` | ❌ Not Available | 0/3 | 3/3 |
| `gemini-3-pro-preview` | ❌ Not Available | 0/3 | 3/3 |
| `gemini-3-flash-preview` | ✅ Available | 2/3 | 1/3 |
| `gemini-2.5-pro` | ❌ Not Available | 0/3 | 3/3 |
| `gemini-2.5-flash` | ✅ Available | 2/3 | 1/3 |
| `gemini-2.5-flash-lite` | ✅ Available | 2/3 | 1/3 |
| `gemini-2.0-flash` | ❌ Not Available | 0/3 | 3/3 |
| `gemini-1.5-pro` | ❌ Not Available | 0/3 | 3/3 |
| `gemini-1.5-flash` | ❌ Not Available | 0/3 | 3/3 |
| `gemini-1.0-pro` | ❌ Not Available | 0/3 | 3/3 |

---

## Detailed Results

### gemini-2.0-flash-exp

**❌ Failed on:**
- API Key 1: {"error":{"code":404,"message":"models/gemini-2.0-flash-exp is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)
- API Key 2: {"error":{"code":404,"message":"models/gemini-2.0-flash-exp is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)
- API Key 3: {"error":{"code":404,"message":"models/gemini-2.0-flash-exp is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)

### gemini-3-pro-preview

**❌ Failed on:**
- API Key 1: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. ","status":"RESOURCE_EXHAUSTED"}} (Status: 429)
- API Key 2: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro\nPlease retry in 23.663356328s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-3-pro"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"model":"gemini-3-pro","location":"global"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerMinute-FreeTier","quotaDimensions":{"location":"global","model":"gemini-3-pro"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerDay-FreeTier","quotaDimensions":{"model":"gemini-3-pro","location":"global"}}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"23s"}]}} (Status: 429)
- API Key 3: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-3-pro\nPlease retry in 22.56480452s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"model":"gemini-3-pro","location":"global"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-3-pro"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerMinute-FreeTier","quotaDimensions":{"model":"gemini-3-pro","location":"global"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerDay-FreeTier","quotaDimensions":{"location":"global","model":"gemini-3-pro"}}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"22s"}]}} (Status: 429)

### gemini-3-flash-preview

**✅ Working on:**
- API Key 2: "OK"
- API Key 3: "OK"

**❌ Failed on:**
- API Key 1: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. ","status":"RESOURCE_EXHAUSTED"}} (Status: 429)

### gemini-2.5-pro

**❌ Failed on:**
- API Key 1: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. ","status":"RESOURCE_EXHAUSTED"}} (Status: 429)
- API Key 2: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.5-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.5-pro\nPlease retry in 56.535871546s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerDay-FreeTier","quotaDimensions":{"model":"gemini-2.5-pro","location":"global"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-pro"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"model":"gemini-2.5-pro","location":"global"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerMinute-FreeTier","quotaDimensions":{"model":"gemini-2.5-pro","location":"global"}}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"56s"}]}} (Status: 429)
- API Key 3: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.5-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.5-pro\nPlease retry in 55.450329846s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerMinute-FreeTier","quotaDimensions":{"model":"gemini-2.5-pro","location":"global"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-pro"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"model":"gemini-2.5-pro","location":"global"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerDay-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.5-pro"}}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"55s"}]}} (Status: 429)

### gemini-2.5-flash

**✅ Working on:**
- API Key 2: "OK"
- API Key 3: "OK"

**❌ Failed on:**
- API Key 1: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. ","status":"RESOURCE_EXHAUSTED"}} (Status: 429)

### gemini-2.5-flash-lite

**✅ Working on:**
- API Key 2: "OK"
- API Key 3: "OK"

**❌ Failed on:**
- API Key 1: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. ","status":"RESOURCE_EXHAUSTED"}} (Status: 429)

### gemini-2.0-flash

**❌ Failed on:**
- API Key 1: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. ","status":"RESOURCE_EXHAUSTED"}} (Status: 429)
- API Key 2: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.0-flash\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash\nPlease retry in 44.72359324s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerMinute-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.0-flash"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.0-flash"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.0-flash"}}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"44s"}]}} (Status: 429)
- API Key 3: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: 0, model: gemini-2.0-flash\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash\nPlease retry in 43.645023151s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_input_token_count","quotaId":"GenerateContentInputTokensPerModelPerMinute-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.0-flash"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.0-flash"}},{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-2.0-flash"}}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"43s"}]}} (Status: 429)

### gemini-1.5-pro

**❌ Failed on:**
- API Key 1: {"error":{"code":404,"message":"models/gemini-1.5-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)
- API Key 2: {"error":{"code":404,"message":"models/gemini-1.5-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)
- API Key 3: {"error":{"code":404,"message":"models/gemini-1.5-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)

### gemini-1.5-flash

**❌ Failed on:**
- API Key 1: {"error":{"code":404,"message":"models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)
- API Key 2: {"error":{"code":404,"message":"models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)
- API Key 3: {"error":{"code":404,"message":"models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)

### gemini-1.0-pro

**❌ Failed on:**
- API Key 1: {"error":{"code":404,"message":"models/gemini-1.0-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)
- API Key 2: {"error":{"code":404,"message":"models/gemini-1.0-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)
- API Key 3: {"error":{"code":404,"message":"models/gemini-1.0-pro is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.","status":"NOT_FOUND"}} (Status: 404)


---

## Recommendations

### Models to KEEP in dropdown:

- `gemini-3-flash-preview` (2/3 keys working)
- `gemini-2.5-flash` (2/3 keys working)
- `gemini-2.5-flash-lite` (2/3 keys working)

### Models to REMOVE from dropdown:

- `gemini-2.0-flash-exp` (not working on any key)
- `gemini-3-pro-preview` (not working on any key)
- `gemini-2.5-pro` (not working on any key)
- `gemini-2.0-flash` (not working on any key)
- `gemini-1.5-pro` (not working on any key)
- `gemini-1.5-flash` (not working on any key)
- `gemini-1.0-pro` (not working on any key)
