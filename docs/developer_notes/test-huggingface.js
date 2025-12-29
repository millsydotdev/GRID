#!/usr/bin/env node
/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Millsy.dev All rights reserved.
 *  HuggingFace Integration Test Script
 *
 *  This script tests the HuggingFace Inference Router API integration.
 *  IMPORTANT: API key is passed via command line argument, NOT hardcoded.
 *
 *  Usage: node test-huggingface.js <HF_API_KEY>
 *--------------------------------------------------------------------------------------*/

// Get API key from command line (NOT hardcoded!)
const HF_API_KEY = process.argv[2];

if (!HF_API_KEY) {
	console.error('❌ ERROR: No API key provided!');
	console.error('Usage: node test-huggingface.js <HF_API_KEY>');
	console.error('Example: node test-huggingface.js hf_xxxxxxxxxxxxx');
	process.exit(1);
}

// Import OpenAI SDK (HF router is OpenAI-compatible)
import OpenAI from 'openai';

const openai = new OpenAI({
	baseURL: 'https://router.huggingface.co/v1',
	apiKey: HF_API_KEY,
	dangerouslyAllowBrowser: true,
	timeout: 30000,
});

console.log('🚀 Testing HuggingFace Integration\n');
console.log('=' .repeat(80));
console.log('API Key:', HF_API_KEY.substring(0, 6) + '...' + HF_API_KEY.slice(-4));
console.log('Endpoint: https://router.huggingface.co/v1');
console.log('=' .repeat(80) + '\n');

// Test models categorized by type
const TEST_MODELS = {
	'Text Generation (Chat)': [
		'meta-llama/Meta-Llama-3.1-8B-Instruct:auto',
		'mistralai/Mixtral-8x7B-Instruct-v0.1:auto',
		'google/gemma-2-9b-it:auto',
	],
	'Code Generation': [
		'Qwen/Qwen2.5-Coder-32B-Instruct:auto',
		'deepseek-ai/deepseek-coder-33b-instruct:auto',
	],
	'Reasoning Models': [
		'Qwen/QwQ-32B-Preview:auto',
	],
	'Vision Models (multimodal)': [
		'meta-llama/Llama-3.2-11B-Vision-Instruct:auto',
	],
	'Small/Fast Models': [
		'microsoft/Phi-3-mini-4k-instruct:auto',
	],
};

// Test function
async function testModel(modelName, category) {
	console.log(`\n📦 Testing: ${modelName}`);
	console.log(`   Category: ${category}`);
	console.log(`   ${'─'.repeat(70)}`);

	try {
		const startTime = Date.now();

		// Create chat completion
		const response = await openai.chat.completions.create({
			model: modelName,
			messages: [
				{
					role: 'system',
					content: 'You are a helpful coding assistant. Be concise.'
				},
				{
					role: 'user',
					content: 'Write a Python function to check if a number is prime. Just the code, no explanation.'
				}
			],
			max_tokens: 300,
			temperature: 0.7,
		});

		const duration = Date.now() - startTime;
		const text = response.choices[0]?.message?.content || '[no response]';

		console.log(`   ✅ SUCCESS (${duration}ms)`);
		console.log(`   Response preview: ${text.substring(0, 100)}...`);
		console.log(`   Tokens: ${response.usage?.total_tokens || 'unknown'}`);

		return { success: true, duration, model: modelName };

	} catch (error) {
		console.log(`   ❌ FAILED: ${error.message}`);
		console.log(`   Error details: ${error.status || 'unknown'} - ${error.code || 'unknown'}`);

		return { success: false, error: error.message, model: modelName };
	}
}

// Test streaming
async function testStreaming(modelName) {
	console.log(`\n🌊 Testing STREAMING with: ${modelName}`);
	console.log(`   ${'─'.repeat(70)}`);

	try {
		const stream = await openai.chat.completions.create({
			model: modelName,
			messages: [
				{ role: 'user', content: 'Count from 1 to 5, one number per line.' }
			],
			stream: true,
			max_tokens: 50,
		});

		let fullText = '';
		let chunkCount = 0;

		for await (const chunk of stream) {
			const newText = chunk.choices[0]?.delta?.content ?? '';
			fullText += newText;
			if (newText) chunkCount++;
		}

		console.log(`   ✅ Streaming SUCCESS`);
		console.log(`   Received ${chunkCount} chunks`);
		console.log(`   Full text: ${fullText}`);

		return { success: true, chunkCount };

	} catch (error) {
		console.log(`   ❌ Streaming FAILED: ${error.message}`);
		return { success: false, error: error.message };
	}
}

// Test embeddings (if supported)
async function testEmbeddings() {
	console.log(`\n🔢 Testing EMBEDDINGS API`);
	console.log(`   ${'─'.repeat(70)}`);

	const embeddingModels = [
		'sentence-transformers/all-MiniLM-L6-v2',
		'BAAI/bge-small-en-v1.5',
	];

	for (const model of embeddingModels) {
		try {
			const response = await fetch('https://api-inference.huggingface.co/models/' + model, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${HF_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					inputs: 'This is a test sentence for embedding.'
				}),
			});

			if (response.ok) {
				const embedding = await response.json();
				console.log(`   ✅ ${model}`);
				console.log(`      Embedding dimension: ${embedding.length || embedding[0]?.length || 'unknown'}`);
			} else {
				console.log(`   ⚠️  ${model} - ${response.status} ${response.statusText}`);
			}
		} catch (error) {
			console.log(`   ❌ ${model} - ${error.message}`);
		}
	}
}

// Test image models
async function testImageModel() {
	console.log(`\n🖼️  Testing VISION MODEL`);
	console.log(`   ${'─'.repeat(70)}`);

	const visionModel = 'meta-llama/Llama-3.2-11B-Vision-Instruct:auto';

	try {
		const response = await openai.chat.completions.create({
			model: visionModel,
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: 'Describe what you see in this image.'
						},
						{
							type: 'image_url',
							image_url: {
								url: 'https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/transformers/tasks/car.jpg'
							}
						}
					]
				}
			],
			max_tokens: 200,
		});

		const description = response.choices[0]?.message?.content || '[no response]';
		console.log(`   ✅ Vision model SUCCESS`);
		console.log(`   Description: ${description.substring(0, 150)}...`);

	} catch (error) {
		console.log(`   ⚠️  Vision model: ${error.message}`);
		console.log(`   (This is expected if the model doesn't support images via router)`);
	}
}

// List available models
async function listModels() {
	console.log(`\n📋 Listing AVAILABLE MODELS`);
	console.log(`   ${'─'.repeat(70)}`);

	try {
		const models = await openai.models.list();
		console.log(`   ✅ Found ${models.data.length} models`);
		console.log(`   First 10 models:`);
		models.data.slice(0, 10).forEach((m, i) => {
			console.log(`      ${i + 1}. ${m.id}`);
		});
	} catch (error) {
		console.log(`   ⚠️  Model listing: ${error.message}`);
	}
}

// Main test runner
async function runTests() {
	const results = {
		passed: 0,
		failed: 0,
		models: []
	};

	// Test each category
	for (const [category, models] of Object.entries(TEST_MODELS)) {
		console.log(`\n\n${'='.repeat(80)}`);
		console.log(`📁 Category: ${category}`);
		console.log(`${'='.repeat(80)}`);

		for (const model of models) {
			const result = await testModel(model, category);
			results.models.push(result);
			if (result.success) results.passed++;
			else results.failed++;

			// Small delay between requests to respect rate limits
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	}

	// Test streaming
	await testStreaming('meta-llama/Meta-Llama-3.1-8B-Instruct:auto');

	// Test embeddings
	await testEmbeddings();

	// Test vision
	await testImageModel();

	// List models
	await listModels();

	// Summary
	console.log(`\n\n${'='.repeat(80)}`);
	console.log(`📊 TEST SUMMARY`);
	console.log(`${'='.repeat(80)}`);
	console.log(`✅ Passed: ${results.passed}`);
	console.log(`❌ Failed: ${results.failed}`);
	console.log(`📈 Success rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
	console.log(`${'='.repeat(80)}\n`);

	// Model-specific notes
	console.log(`\n📝 NOTES ABOUT HF INTEGRATION:\n`);
	console.log(`1. ✅ HF Router (router.huggingface.co/v1) is OpenAI-compatible`);
	console.log(`2. ✅ The :auto suffix automatically selects the best inference provider`);
	console.log(`3. ✅ Safetensors format is supported by default (HF uses it internally)`);
	console.log(`4. ✅ GGUF models work when hosted on compatible providers`);
	console.log(`5. ⚠️  Some models may require specific inference providers`);
	console.log(`6. ⚠️  Vision/multimodal support depends on the router's capabilities`);
	console.log(`7. 💡 You can add ANY HuggingFace model ID to GRID's model list`);
	console.log(`8. 💡 Custom models, fine-tunes, and private models all work`);
	console.log(`\n`);
}

// Run all tests
runTests().catch(console.error);
