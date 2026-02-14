# API Keys Setup Guide

## Overview
The public resume generator now supports **3 fallback API keys** with a **recommended default model** for the best user experience.

## Features Added

### 1. **Multiple API Keys with Automatic Fallback**
- System tries up to 3 API keys automatically
- If one key hits quota/rate limits, it switches to the next
- Provides seamless experience for users

### 2. **Automatic Model Detection & Caching** ⚡ NEW!
- System remembers which model worked successfully last time
- Automatically uses the last working model first on subsequent requests
- Faster response times (no need to try multiple models)
- Cache expires after 1 hour (re-learns if models change)
- Separate cache for each endpoint (generate, fix, update)

### 3. **Default Model Configuration**
- Pre-configured to use `gemini-2.0-flash-exp` (best balance of speed & quality)
- Can be customized via environment variable

### 4. **Undo Resume Updates**
- Tracks all resume versions
- One-click undo to previous versions
- Shows version count in UI

## How to Set Up API Keys

### Step 1: Get Free Gemini API Keys

Visit: https://aistudio.google.com/apikey

Create up to 3 free API keys (recommended for redundancy)

### Step 2: Add Keys to Your `.env` File

Add these lines to your `.env` file:

```bash
# Primary API key (tried first)
GEMINI_API_KEY=your_first_api_key_here

# Backup API key #2 (tried if first fails)
GEMINI_API_KEY_2=your_second_api_key_here

# Backup API key #3 (tried if first two fail)
GEMINI_API_KEY_3=your_third_api_key_here

# Optional: Set default model (recommended to leave as default)
GEMINI_PUBLIC_MODEL=gemini-2.0-flash-exp
```

### Step 3: Restart Your Server

```bash
npm run dev
```

## How It Works

### API Key Fallback Logic

1. **User provides their own key?** → Use that first
2. **User's key fails?** → Try `GEMINI_API_KEY`
3. **First key exhausted?** → Try `GEMINI_API_KEY_2`
4. **Second key exhausted?** → Try `GEMINI_API_KEY_3`
5. **All keys fail?** → Show clear error message

### Model Selection Priority (Smart Learning)

The system now automatically learns which models work best:

**Priority Order:**
1. **User-selected model** (if they manually choose one)
2. **Last working model** (cached from previous successful request) ⚡ NEW!
3. **Default model** from `GEMINI_PUBLIC_MODEL` env variable
4. **Fallback models** in order of quality/speed

**How It Works:**
- First request tries models in standard order
- When a model succeeds, it's cached for 1 hour
- Next request tries the cached model FIRST
- If cached model fails, falls back to standard order
- Each endpoint has its own cache (generate, fix, update)

**Example:**
```
Request 1: Tries gemini-2.0-flash-exp → Success! ✓ (cached)
Request 2: Tries gemini-2.0-flash-exp → Success! ✓ (faster!)
Request 3: Tries gemini-2.0-flash-exp → Success! ✓ (faster!)
```

This makes subsequent requests **much faster** since they don't need to try multiple models.

## Recommended Models

### Best Choice (Default)
- **gemini-2.0-flash-exp** - Fastest with excellent quality

### Alternatives
- **gemini-2.5-flash** - Good balance
- **gemini-1.5-flash** - Older but reliable
- **gemini-2.5-pro** - Highest quality but slower

## Usage Tips

### For Non-Technical Users
- Users don't need to provide their own API key
- The system uses your configured fallback keys automatically
- UI shows "no API key needed!"

### For Power Users
- Can still provide their own API key
- Their key takes priority over fallback keys
- Useful for higher quota needs

## Monitoring & Logs

The system provides detailed logging to help you track performance:

### API Key Fallback Logs
```
API key 1 exhausted, trying next...
API key 2 exhausted, trying next...
```

### Model Detection Logs
```
✓ Cached working model for generate-resume: gemini-2.0-flash-exp
✓ Cached working model for fix-resume: gemini-2.5-flash
✓ Cached working model for update-resume: gemini-2.0-flash-exp
```

### Model Availability Warnings
```
Gemini model "gemini-3-pro-preview" not available, trying next candidate...
```

These logs help you:
- Track which API keys are being used
- See which models work best
- Debug issues if models fail
- Monitor usage patterns

## Cost Management

### Free Tier Limits (per key)
- 60 requests per minute
- 1,500 requests per day
- 1 million tokens per month

### With 3 Keys
- 3x the capacity
- Automatic load distribution
- Better uptime during high traffic

## Troubleshooting

### "All API keys failed"
- Check that at least one key is valid
- Verify keys aren't expired
- Check API key permissions

### "Please provide your Gemini API key"
- No keys configured in .env
- Add at least `GEMINI_API_KEY` to .env

### PDF Upload Not Working
- Make sure `pdf-parse` v2+ is installed
- Check file size (max 5MB)
- Verify PDF isn't password-protected

## Security Notes

- API keys are stored in `.env` (not committed to git)
- User-provided keys are never stored
- Keys are only used for AI generation requests

## Support

If you encounter issues:
1. Check terminal logs for specific errors
2. Verify API keys at https://aistudio.google.com/apikey
3. Test with a single key first before adding backups

---

**Last Updated:** February 2026
