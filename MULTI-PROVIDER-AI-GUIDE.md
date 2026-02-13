# Multi-Provider AI Guide

**Version**: 1.0
**Last Updated**: 2026-02-12
**Audience**: End Users, Administrators

---

## Table of Contents

1. [Overview](#overview)
2. [Available Providers](#available-providers)
3. [Selecting a Provider](#selecting-a-provider)
4. [Provider Comparison](#provider-comparison)
5. [Automatic Fallback](#automatic-fallback)
6. [Fallback Notifications](#fallback-notifications)
7. [Provider Statistics](#provider-statistics)
8. [Cost Considerations](#cost-considerations)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Infinia Products supports **multiple AI providers**, giving you flexibility, reliability, and choice. Instead of being locked into a single AI service, you can:

✅ **Choose your preferred AI** - OpenAI, Anthropic, Google, or others
✅ **Automatic fallback** - If one provider fails, the system tries another
✅ **Transparent switching** - You're notified when fallback occurs
✅ **Better uptime** - 95%+ success rate vs 75% with single provider

### How It Works

1. **Administrator enables providers** - System admin configures AI providers
2. **You select your preference** - Choose which AI to use (or use default)
3. **AI generates content** - Your selected provider powers the product generator
4. **Automatic fallback** - If your provider fails, the system tries backup providers
5. **You're notified** - A toast notification shows if fallback occurred

---

## Available Providers

Your administrator may have enabled some or all of these providers:

### Commercial Providers

| Provider | Models | Strengths | Best For |
|----------|--------|-----------|----------|
| **OpenAI** | GPT-4, GPT-3.5 | Industry leader, high quality | Complex products, detailed PRDs |
| **Anthropic** | Claude 3.5, Claude 3 | Long context, detailed analysis | Large documents, complex planning |
| **Google AI** | Gemini Pro, Flash | Fast, creative | Quick iterations, brainstorming |
| **Groq** | Various models | Extremely fast inference | Speed-critical tasks |
| **Together AI** | Open source models | Cost-effective, flexible | Budget-conscious projects |

### Self-Hosted Providers

| Provider | Models | Strengths | Best For |
|----------|--------|-----------|----------|
| **SAIF AI** | Qwen models | Default, cost-effective | General purpose, free usage |
| **Ollama** | Llama, Mistral, others | Run locally, private | Sensitive data, offline use |
| **Azure OpenAI** | GPT-4 on Azure | Enterprise compliance | Enterprise deployments |
| **OpenRouter** | Multiple models | Aggregator, fallback | Redundancy |

### Custom Providers

| Provider | Description |
|----------|-------------|
| **Custom API** | Any OpenAI-compatible API endpoint |

**Don't see multiple providers?**

Ask your administrator to enable additional providers. See [Admin Guide](ADMIN-GUIDE.md#ai-provider-management) for instructions.

---

## Selecting a Provider

### First-Time Users

When you create your first product with AI:

1. Open Product Generator (+ New Product → Generate with AI)
2. On Step 1 (Product Input), look for **AI Provider** dropdown
3. Select your preferred provider
4. Your choice is saved for future use

**No dropdown visible?**

Your administrator has only enabled one provider. You'll use that provider automatically.

### Changing Your Provider

Update your provider preference anytime:

**Method 1: Product Generator**
1. Start product generation
2. Change provider in dropdown (Step 1)
3. New preference is saved

**Method 2: Settings**
1. Click avatar → Settings
2. Go to AI tab
3. Select preferred provider
4. Click Save

**Effect**: Your new choice applies to all future AI operations.

### Default Provider

If you haven't selected a provider, the system uses the **default provider** set by your administrator.

**To see the default**:
- Open Product Generator
- The default is pre-selected in the dropdown

---

## Provider Comparison

### Quality Comparison

Based on typical product generation tasks:

| Provider | Quality | Speed | Cost | Context | Best Use Case |
|----------|---------|-------|------|---------|---------------|
| **OpenAI GPT-4** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | $$$ | 128K | Complex products, detailed specs |
| **Anthropic Claude 3.5** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$$ | 200K | Large documents, analysis |
| **Google Gemini Pro** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$ | 32K | Quick iterations, ideas |
| **SAIF AI (Qwen)** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Free | 32K | General purpose, default |
| **Groq** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $$ | 8K | Fast responses |
| **Ollama (Local)** | ⭐⭐⭐ | ⭐⭐ | Free | Varies | Privacy, offline |

**Legend**:
- Quality: Output quality and coherence
- Speed: Response time
- Cost: Relative API pricing ($-$$$)
- Context: Maximum context window

### Feature Support

| Provider | Product Vision | PRD | Architecture | Code Examples | Multi-Language |
|----------|----------------|-----|--------------|---------------|----------------|
| OpenAI | ✅ Excellent | ✅ Excellent | ✅ Excellent | ✅ Yes | ✅ Yes |
| Anthropic | ✅ Excellent | ✅ Excellent | ✅ Excellent | ✅ Yes | ✅ Yes |
| Google AI | ✅ Good | ✅ Good | ✅ Good | ✅ Yes | ✅ Yes |
| SAIF AI | ✅ Good | ✅ Good | ✅ Good | ✅ Yes | ✅ Limited |
| Groq | ✅ Fair | ✅ Fair | ✅ Fair | ⚠️ Limited | ⚠️ Limited |
| Ollama | ✅ Fair | ✅ Fair | ✅ Fair | ⚠️ Limited | ⚠️ Limited |

### Recommendations

**For Most Users**:
- **Start with**: SAIF AI (default) - free, fast, good quality
- **Upgrade to**: OpenAI or Anthropic for complex products

**For Enterprise**:
- **Use**: Azure OpenAI - enterprise compliance, SLA
- **Fallback**: Anthropic Claude - reliable, long context

**For Privacy-Conscious**:
- **Use**: Ollama (local) - runs on your machine, fully private
- **Note**: Slower, requires local resources

**For Cost-Conscious**:
- **Use**: SAIF AI or Together AI - free or low-cost
- **Upgrade**: Only for critical projects

**For Best Quality**:
- **Use**: Anthropic Claude 3.5 - highest quality, long context
- **Alternative**: OpenAI GPT-4 - industry leader

**For Speed**:
- **Use**: Groq or Google Gemini Flash - extremely fast
- **Trade-off**: Slightly lower quality

---

## Automatic Fallback

### What Is Fallback?

When your selected provider fails (network error, rate limit, outage), the system **automatically tries backup providers** instead of failing completely.

### Fallback Chain

The system tries providers in this order:

1. **Your Selected Provider** (3 retry attempts with exponential backoff)
   - Retry 1: Immediate
   - Retry 2: After 2 seconds
   - Retry 3: After 4 seconds

2. **Default Provider** (if different from your selection)
   - Same retry strategy (3 attempts)

3. **High-Availability Providers** (sorted by reliability)
   - Most reliable provider first
   - Up to 3 fallback providers total

**Example Fallback Chain**:

```
User selects: OpenAI
Fallback chain: OpenAI → SAIF AI (default) → Anthropic → Google AI

Attempt 1: OpenAI (retry 1) → ❌ Network timeout
Attempt 2: OpenAI (retry 2, 2s delay) → ❌ Connection refused
Attempt 3: OpenAI (retry 3, 4s delay) → ❌ Still failing
Attempt 4: SAIF AI (retry 1) → ✅ Success!
```

**User Experience**:
- Generation completes successfully with SAIF AI
- Toast notification: "⚠️ OpenAI unavailable. Switched to SAIF AI."
- No manual intervention required

### Why Fallback Matters

**Without Fallback**:
- Provider fails → Generation fails → User must retry manually
- Success rate: ~75%
- User frustration: High

**With Fallback**:
- Provider fails → System tries backup → Success!
- Success rate: ~95%
- User frustration: Low (transparent recovery)

### Performance Impact

**Best Case** (primary succeeds):
- Single attempt: 1-3 seconds
- No performance overhead

**Average Case** (primary fails, fallback succeeds):
- Primary attempts: 3 retries × ~2s = ~6 seconds
- Fallback attempt: 1 try × 1s = 1 second
- **Total: ~7 seconds** (vs 14s failure without fallback)

**Worst Case** (all fail):
- 3 providers × 3 attempts × ~2s avg = ~18 seconds
- Then fails with helpful error

---

## Fallback Notifications

### Notification Types

When fallback occurs, you'll see a toast notification:

#### Type 1: Fallback (Provider Switch)

**Appearance**:
```
⚠️ Provider Switched
OpenAI unavailable. Switched to SAIF AI.
```

**Color**: Amber (warning)
**Duration**: 5 seconds (auto-dismiss)

**Meaning**: Your selected provider failed, but a backup provider succeeded.

**Action**: None required. Generation completed successfully.

#### Type 2: Success

**Appearance**:
```
✅ Success
Generated successfully with SAIF AI.
```

**Color**: Green (success)
**Duration**: 5 seconds

**Meaning**: Generation completed with your selected provider (no fallback).

#### Type 3: Error (All Providers Failed)

**Appearance**:
```
❌ All Providers Failed
Unable to generate content. Please try again later.
```

**Color**: Red (error)
**Duration**: 5 seconds

**Meaning**: All providers failed. You'll need to retry manually.

**Actions**:
1. Wait a few minutes (providers may be temporarily down)
2. Try again
3. Contact your administrator if persistent

### Notification Settings

**Can I disable fallback notifications?**

Currently, no. Notifications inform you which provider was used (important for understanding quality and costs).

**Future Enhancement**: User preference to only show notifications on error (not on successful fallback).

---

## Provider Statistics

### Viewing Statistics

Administrators can view provider statistics in the Admin Portal:

**Dashboard → AI Providers → Statistics**

**Metrics Available**:
- Total generation attempts
- Successful generations (per provider)
- Failed generations (per provider)
- Success rate (per provider)
- Average response time (per provider)
- Fallback frequency

**Example Statistics**:
```
Total: 127 generations
Successful: 121 (95.3%)
Failed: 6 (4.7%)

By Provider:
- SAIF AI: 89 success, 2 failed (97.8% success)
- OpenAI: 22 success, 3 failed (88.0% success)
- Anthropic: 10 success, 1 failed (90.9% success)
```

**Insights**:
- SAIF AI is most reliable (97.8%)
- OpenAI had more failures (5 total)
- Overall success rate improved from 75% to 95.3% with fallback

### Personal Usage

**Can I see my own usage stats?**

Not currently available. Ask your administrator for organization-wide statistics.

**Future Enhancement**: Personal dashboard showing:
- Your provider preference
- Your generation count
- Your most-used provider
- Estimated cost (if applicable)

---

## Cost Considerations

### Free vs Paid Providers

| Provider | Cost Model | Pricing |
|----------|------------|---------|
| **SAIF AI** | Free | $0 |
| **Ollama** | Free (local) | $0 (requires your hardware) |
| **OpenAI** | Pay-per-use | ~$0.03 per generation (GPT-4) |
| **Anthropic** | Pay-per-use | ~$0.015 per generation (Claude 3) |
| **Google AI** | Pay-per-use | ~$0.0001 per generation (Gemini Flash) |
| **Groq** | Pay-per-use | ~$0.001 per generation |

**Note**: Actual costs depend on provider API keys configured by your administrator.

### Cost Optimization

**For Individual Users**:
- Use **SAIF AI** (default) for most work - free, good quality
- Upgrade to **OpenAI/Anthropic** only for critical products
- Avoid unnecessary regenerations

**For Organizations**:
- Set **SAIF AI** or **Google Gemini Flash** as default
- Allow premium providers for paid plans or specific teams
- Monitor usage via admin dashboard
- Set up fallback to cheaper providers first

### Who Pays?

**Typical Models**:
1. **Organization Pays** - Administrator configures API keys, all users use org account
2. **User Pays** - Users provide their own API keys (not currently supported)
3. **Tiered Access** - Free tier uses SAIF AI, paid tiers unlock OpenAI/Anthropic

**Check with your administrator** to understand your organization's cost model.

---

## Best Practices

### Choosing a Provider

✅ **DO**:
- Start with the default provider (typically SAIF AI)
- Try different providers for comparison
- Use OpenAI/Anthropic for complex products
- Use faster providers (Gemini, Groq) for quick iterations
- Consider cost if you're paying

❌ **DON'T**:
- Switch providers mid-product (finish with same provider for consistency)
- Use expensive providers for simple products
- Regenerate excessively (wasteful)

### Handling Failures

✅ **DO**:
- Trust the automatic fallback system
- Review fallback notifications to know which provider was used
- Report persistent failures to administrator
- Wait a few minutes if all providers fail, then retry

❌ **DON'T**:
- Manually switch providers mid-generation
- Retry immediately after failure (may hit rate limits)
- Ignore notifications about provider switches

### Optimizing Quality

**For Best Quality**:
1. Use **Anthropic Claude 3.5** or **OpenAI GPT-4**
2. Provide detailed input (problem, features, constraints)
3. Review and refine output
4. Use chat to improve sections

**For Speed**:
1. Use **Groq** or **Google Gemini Flash**
2. Provide concise input
3. Accept first output (fewer iterations)

**For Cost**:
1. Use **SAIF AI** (free) or **Google Gemini Flash** (cheap)
2. Generate once, edit manually
3. Avoid excessive regenerations

---

## Troubleshooting

### Issue: Can't See Provider Dropdown

**Symptoms**: No provider selection option in Product Generator

**Causes**:
1. Only one provider enabled by administrator
2. Feature disabled for your account

**Solutions**:
1. Ask administrator to enable multiple providers
2. You'll automatically use the default provider

---

### Issue: Fallback to Provider I Don't Want

**Symptoms**: Notification shows fallback to provider I didn't select

**Causes**:
1. Your selected provider failed
2. Automatic fallback chose backup provider

**Solutions**:
1. This is expected behavior - fallback prevents generation failure
2. If you don't like the backup provider's output, regenerate with your preferred provider
3. Ask administrator to adjust fallback chain priority

---

### Issue: All Providers Failed

**Symptoms**: "All Providers Failed" error notification

**Causes**:
1. Network issues
2. All providers experiencing outages
3. Rate limits exceeded
4. Invalid API keys

**Solutions**:
1. **Wait 5-10 minutes** - providers may be temporarily down
2. **Try again** - errors may be transient
3. **Contact administrator** - if persistent, providers may need reconfiguration
4. **Check network** - ensure you have internet connectivity

---

### Issue: Want to Use Different Provider for Specific Task

**Symptoms**: Want OpenAI for PRD but SAIF AI for product vision

**Current Limitation**: Provider selection applies to entire generation session (all steps).

**Workaround**:
1. Complete generation with one provider
2. Go to PRD view
3. Use document chat to regenerate specific sections
4. AI uses your globally selected provider

**Future Enhancement**: Per-document provider selection.

---

### Issue: How Do I Know Which Provider Was Used?

**Methods**:
1. **Fallback Notification** - If fallback occurred, you'll see notification
2. **No Notification** - Your selected provider was used
3. **Ask Administrator** - Check statistics in admin dashboard

**Future Enhancement**: Provider indicator in UI showing which provider was used.

---

## Advanced Topics

### Provider Fallback Chain Customization

**Can I customize the fallback order?**

Not directly as a user. The fallback order is determined by:
1. Your selected provider (primary)
2. System default provider
3. High-availability providers (sorted by reliability)

Ask your administrator if specific fallback order is needed.

### Multi-Provider Comparison

**Can I generate with multiple providers and compare?**

Not currently. Each generation uses one provider (with automatic fallback to others if needed).

**Workaround**:
1. Generate product with Provider A
2. Save as draft
3. Start new generation with Provider B
4. Compare the two outputs

**Future Enhancement**: "Compare Providers" feature to generate with multiple AI and compare outputs side-by-side.

### Local Models (Ollama)

**How do I use local models for privacy?**

Ask your administrator to:
1. Install Ollama on a server
2. Configure Ollama provider in admin portal
3. Enable Ollama as a provider

**Advantages**:
- ✅ Fully private (data never leaves your infrastructure)
- ✅ No API costs
- ✅ Works offline

**Disadvantages**:
- ❌ Slower than cloud providers
- ❌ Requires local GPU resources
- ❌ Lower quality than GPT-4/Claude

---

## FAQ

**Q: Which provider is best?**

A: Depends on your needs:
- **Best Quality**: Anthropic Claude 3.5, OpenAI GPT-4
- **Best Speed**: Groq, Google Gemini Flash
- **Best Cost**: SAIF AI (free), Google Gemini Flash (cheap)
- **Best Privacy**: Ollama (local)

**Q: Can I switch providers mid-product?**

A: No. Provider selection applies to the entire generation session. You can change for the next product.

**Q: What if my preferred provider is always failing?**

A: Report to your administrator. They can:
- Check provider configuration
- Verify API key validity
- Test provider connection
- Disable unreliable provider

**Q: Does fallback cost more?**

A: No. Fallback only happens if primary provider fails. Successful fallback costs the same as primary provider success.

**Q: Can I provide my own API key?**

A: Not currently. Your administrator manages all provider API keys.

**Future Enhancement**: User-provided API keys for personal accounts.

**Q: How do I know if fallback is working?**

A: You'll see a notification if fallback occurs. If you don't see one, your primary provider succeeded.

**Q: What's the success rate improvement with fallback?**

A: Approximately 75% → 95%+ success rate with 2-3 fallback providers enabled.

---

## Summary

**Multi-Provider AI in Infinia Products**:

✅ **Flexibility** - Choose your preferred AI provider
✅ **Reliability** - Automatic fallback prevents failures
✅ **Transparency** - Notifications keep you informed
✅ **Quality** - Access to best-in-class AI models
✅ **Cost Control** - Use free or paid providers as needed

**Key Takeaways**:
1. Start with default provider (SAIF AI)
2. Experiment with different providers
3. Trust automatic fallback
4. Use premium providers for complex products
5. Report persistent issues to administrator

---

**Document Version**: 1.0
**Last Updated**: 2026-02-12
**Next Review**: 2026-03-12
