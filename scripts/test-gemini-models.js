import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Load API keys from .env
const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

// All models to test
const MODELS_TO_TEST = [
  "gemini-2.0-flash-exp",
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-1.0-pro",
];

async function testModel(apiKey, model, keyIndex) {
  try {
    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model,
      contents: "Say 'OK' if you can read this."
    });
    
    const text = result.text || '';
    return {
      success: true,
      keyIndex: keyIndex + 1,
      response: text.substring(0, 50),
    };
  } catch (error) {
    return {
      success: false,
      keyIndex: keyIndex + 1,
      error: error.message || 'Unknown error',
      status: error.status || 'N/A',
    };
  }
}

async function runHealthCheck() {
  const results = {};
  
  console.log(`\nTesting ${MODELS_TO_TEST.length} models with ${API_KEYS.length} API keys...`);
  console.log('This will take approximately ' + (MODELS_TO_TEST.length * API_KEYS.length) + ' seconds.\n');
  
  for (const model of MODELS_TO_TEST) {
    results[model] = {
      workingKeys: [],
      failedKeys: [],
    };
    
    for (let i = 0; i < API_KEYS.length; i++) {
      const result = await testModel(API_KEYS[i], model, i);
      
      if (result.success) {
        results[model].workingKeys.push(result);
        console.log(`✓ ${model} - Key ${result.keyIndex}: SUCCESS`);
      } else {
        results[model].failedKeys.push(result);
        console.log(`✗ ${model} - Key ${result.keyIndex}: ${result.error}`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log(''); // Empty line between models
  }
  
  return results;
}

function generateMarkdownReport(results) {
  let md = '# Gemini Models Health Check Report\n\n';
  md += `**Date**: ${new Date().toISOString()}\n\n`;
  md += `**API Keys Tested**: ${API_KEYS.length}\n\n`;
  md += '---\n\n';
  
  md += '## Summary\n\n';
  md += '| Model | Status | Working Keys | Failed Keys |\n';
  md += '|-------|--------|--------------|-------------|\n';
  
  for (const [model, data] of Object.entries(results)) {
    const status = data.workingKeys.length > 0 ? '✅ Available' : '❌ Not Available';
    md += `| \`${model}\` | ${status} | ${data.workingKeys.length}/${API_KEYS.length} | ${data.failedKeys.length}/${API_KEYS.length} |\n`;
  }
  
  md += '\n---\n\n## Detailed Results\n\n';
  
  for (const [model, data] of Object.entries(results)) {
    md += `### ${model}\n\n`;
    
    if (data.workingKeys.length > 0) {
      md += '**✅ Working on:**\n';
      data.workingKeys.forEach(key => {
        md += `- API Key ${key.keyIndex}: "${key.response}"\n`;
      });
      md += '\n';
    }
    
    if (data.failedKeys.length > 0) {
      md += '**❌ Failed on:**\n';
      data.failedKeys.forEach(key => {
        md += `- API Key ${key.keyIndex}: ${key.error} (Status: ${key.status})\n`;
      });
      md += '\n';
    }
  }
  
  md += '\n---\n\n## Recommendations\n\n';
  md += '### Models to KEEP in dropdown:\n\n';
  Object.entries(results).forEach(([model, data]) => {
    if (data.workingKeys.length > 0) {
      md += `- \`${model}\` (${data.workingKeys.length}/${API_KEYS.length} keys working)\n`;
    }
  });
  
  md += '\n### Models to REMOVE from dropdown:\n\n';
  Object.entries(results).forEach(([model, data]) => {
    if (data.workingKeys.length === 0) {
      md += `- \`${model}\` (not working on any key)\n`;
    }
  });
  
  return md;
}

// Run the health check
(async () => {
  try {
    if (API_KEYS.length === 0) {
      console.error('❌ No API keys found in .env file!');
      console.error('Please set GEMINI_API_KEY, GEMINI_API_KEY_2, and/or GEMINI_API_KEY_3 in your .env file.');
      process.exit(1);
    }

    console.log('🔍 Starting Gemini Models Health Check...');
    console.log(`Found ${API_KEYS.length} API key(s) to test.\n`);
    
    const results = await runHealthCheck();
    const report = generateMarkdownReport(results);
    
    const outputPath = path.join(__dirname, '..', 'GEMINI_MODELS_HEALTH_CHECK.md');
    fs.writeFileSync(outputPath, report);
    
    console.log('\n✅ Health check complete!');
    console.log(`📄 Report saved to: ${outputPath}`);
    
    // Summary statistics
    const totalModels = Object.keys(results).length;
    const workingModels = Object.values(results).filter(r => r.workingKeys.length > 0).length;
    const failedModels = totalModels - workingModels;
    
    console.log(`\n📊 Summary: ${workingModels}/${totalModels} models working, ${failedModels} not available`);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
})();
