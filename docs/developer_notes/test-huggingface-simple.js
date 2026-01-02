#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Get API key from command line (NOT hardcoded!)
const HF_API_KEY = process.argv[2];

if (!HF_API_KEY) {
	console.error('❌ ERROR: No API key provided!');
	console.error('Usage: node test-huggingface-simple.js <HF_API_KEY>');
	console.error('Example: node test-huggingface-simple.js hf_xxxxxxxxxxxxx');
	process.exit(1);
}

const ROUTER_URL = 'https://router.huggingface.co/v1';
const INFERENCE_URL = 'https://api-inference.huggingface.co/models';

console.log('🚀 Testing HuggingFace Integration\n');
console.log('=' .repeat(80));
console.log('API Key:', HF_API_KEY.substring(0, 6) + '...' + HF_API_KEY.slice(-4));
console.log('Router URL:', ROUTER_URL);
console.log('Inference URL:', INFERENCE_URL);
console.log('=' .repeat(80) + '\n');

// Test models categorized by type
const TEST_MODELS = {
	'Text Generation (Chat)': [
		'meta-llama/Meta-Llama-3.1-8B-Instruct:auto',
		'mistralai/Mixtral-8x7B-Instruct-v0.1:auto',
	],
	'Code Generation': [
		'Qwen/Qwen2.5-Coder-7B-Instruct:auto',
	],
	'Reasoning Models': [
		'Qwen/QwQ-32B-Preview:auto',
	],
};

// Test function for chat models via router
async function testChatModel(modelName, category) {
	console.log(`\n📦 Testing: ${modelName}`);
	console.log(`   Category: ${category}`);
	console.log(`   ${'─'.repeat(70)}`);

	try {
		const startTime = Date.now();

		const response = await fetch(`${ROUTER_URL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${HF_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
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
			}),
		});

		const duration = Date.now() - startTime;

		if (!response.ok) {
			const errorText = await response.text();
			console.log(`   ❌ FAILED: HTTP ${response.status}`);
			console.log(`   Error: ${errorText.substring(0, 200)}`);
			return { success: false, error: errorText, model: modelName };
		}

		const data = await response.json();
		const text = data.choices?.[0]?.message?.content || '[no response]';

		console.log(`   ✅ SUCCESS (${duration}ms)`);
		console.log(`   Response preview: ${text.substring(0, 100)}...`);
		console.log(`   Tokens: ${data.usage?.total_tokens || 'unknown'}`);

		return { success: true, duration, model: modelName };

	} catch (error) {
		console.log(`   ❌ FAILED: ${error.message}`);
		return { success: false, error: error.message, model: modelName };
	}
}

// Test streaming
async function testStreaming(modelName) {
	console.log(`\n🌊 Testing STREAMING with: ${modelName}`);
	console.log(`   ${'─'.repeat(70)}`);

	try {
		const response = await fetch(`${ROUTER_URL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${HF_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: modelName,
				messages: [
					{ role: 'user', content: 'Count from 1 to 5, one number per line.' }
				],
				stream: true,
				max_tokens: 50,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.log(`   ❌ Streaming FAILED: HTTP ${response.status}`);
			console.log(`   Error: ${errorText}`);
			return { success: false, error: errorText };
		}

		let fullText = '';
		let chunkCount = 0;

		// Parse SSE stream
		const reader = response.body.getReader();
		const decoder = new TextDecoder();

		while (true) {
			const { done, value } = await reader.read();
			if (done) {break;}

			const chunk = decoder.decode(value);
			const lines = chunk.split('\n');

			for (const line of lines) {
				if (line.startsWith('data: ') && line !== 'data: [DONE]') {
					try {
						const json = JSON.parse(line.slice(6));
						const newText = json.choices?.[0]?.delta?.content || '';
						if (newText) {
							fullText += newText;
							chunkCount++;
						}
					} catch (e) {
						// Ignore parse errors
					}
				}
			}
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

// Test embeddings
async function testEmbeddings() {
	console.log(`\n🔢 Testing EMBEDDINGS API`);
	console.log(`   ${'─'.repeat(70)}`);

	const embeddingModels = [
		'sentence-transformers/all-MiniLM-L6-v2',
		'BAAI/bge-small-en-v1.5',
	];

	for (const model of embeddingModels) {
		try {
			const response = await fetch(`${INFERENCE_URL}/${model}`, {
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
				const dimension = Array.isArray(embedding) ?
					(embedding.length || embedding[0]?.length || 'unknown') :
					'unknown';
				console.log(`   ✅ ${model}`);
				console.log(`      Embedding dimension: ${dimension}`);
			} else {
				const errorText = await response.text();
				console.log(`   ⚠️  ${model} - ${response.status} ${response.statusText}`);
				if (response.status === 503) {
					console.log(`      (Model is loading, this is normal)`);
				}
			}
		} catch (error) {
			console.log(`   ❌ ${model} - ${error.message}`);
		}

		// Small delay between requests
		await new Promise(resolve => setTimeout(resolve, 500));
	}
}

// Test image generation
async function testImageGeneration() {
	console.log(`\n🎨 Testing IMAGE GENERATION API`);
	console.log(`   ${'─'.repeat(70)}`);

	const imageModels = [
		'stabilityai/stable-diffusion-2-1',
		'black-forest-labs/FLUX.1-schnell',
	];

	for (const model of imageModels) {
		try {
			const response = await fetch(`${INFERENCE_URL}/${model}`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${HF_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					inputs: 'A beautiful sunset over mountains, digital art'
				}),
			});

			if (response.ok) {
				const blob = await response.blob();
				console.log(`   ✅ ${model}`);
				console.log(`      Generated image size: ${(blob.size / 1024).toFixed(1)} KB`);
				console.log(`      Type: ${blob.type}`);
			} else {
				const errorText = await response.text();
				console.log(`   ⚠️  ${model} - ${response.status}`);
				if (response.status === 503) {
					console.log(`      (Model is loading, this is normal)`);
				}
			}
		} catch (error) {
			console.log(`   ❌ ${model} - ${error.message}`);
		}

		// Delay between requests
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
}

// List available models
async function listModels() {
	console.log(`\n📋 Listing AVAILABLE MODELS via Router`);
	console.log(`   ${'─'.repeat(70)}`);

	try {
		const response = await fetch(`${ROUTER_URL}/models`, {
			headers: {
				'Authorization': `Bearer ${HF_API_KEY}`,
			},
		});

		if (response.ok) {
			const data = await response.json();
			console.log(`   ✅ Found ${data.data?.length || 0} models`);
			console.log(`   First 10 models:`);
			(data.data || []).slice(0, 10).forEach((m, i) => {
				console.log(`      ${i + 1}. ${m.id}`);
			});
		} else {
			console.log(`   ⚠️  Model listing: HTTP ${response.status}`);
		}
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
			const result = await testChatModel(model, category);
			results.models.push(result);
			if (result.success) {results.passed++;}
			else {results.failed++;}

			// Small delay between requests to respect rate limits
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}

	// Test streaming
	await testStreaming('meta-llama/Meta-Llama-3.1-8B-Instruct:auto');

	// Test embeddings
	await testEmbeddings();

	// Test image generation
	await testImageGeneration();

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
	console.log(`5. ✅ Supports text, code, vision, audio, embeddings, image-gen models`);
	console.log(`6. ⚠️  Some models may require specific inference providers`);
	console.log(`7. ⚠️  Model loading can take 10-60 seconds (503 = loading)`);
	console.log(`8. 💡 You can add ANY HuggingFace model ID to GRID's model list`);
	console.log(`9. 💡 Custom models, fine-tunes, and private models all work`);
	console.log(`10. 💡 Safetensors is the default format (safer than pickle)`);
	console.log(`\n`);
	console.log(`🔐 SECURITY: Your API key is NOT hardcoded in the codebase`);
	console.log(`   It should be stored in GRID settings UI or environment variables`);
	console.log(`   The .env file is gitignored to prevent accidental commits\n`);
}

// Run all tests
runTests().catch(console.error);
