/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';

export type ImageProvider = 'huggingface' | 'openai' | 'stability' | 'openai-compatible' | 'automatic1111' | 'comfyui';

export interface ImageGenerationModel {
	id: string;
	name: string;
	description: string;
	provider: ImageProvider;
	defaultParams: {
		width: number;
		height: number;
		steps?: number;
		guidance_scale?: number;
		cfg_scale?: number;
		sampler?: string;
	};
}

export const AVAILABLE_IMAGE_MODELS: ImageGenerationModel[] = [
	// OpenAI Models
	{
		id: 'dall-e-3',
		name: 'DALL-E 3',
		description: "OpenAI's latest image generation model with exceptional quality",
		provider: 'openai',
		defaultParams: {
			width: 1024,
			height: 1024,
		},
	},
	{
		id: 'dall-e-2',
		name: 'DALL-E 2',
		description: "OpenAI's DALL-E 2 for fast, high-quality images",
		provider: 'openai',
		defaultParams: {
			width: 1024,
			height: 1024,
		},
	},
	// HuggingFace Models
	{
		id: 'black-forest-labs/FLUX.1-dev',
		name: 'FLUX.1 Dev',
		description: 'State-of-the-art image generation with exceptional quality',
		provider: 'huggingface',
		defaultParams: {
			width: 1024,
			height: 1024,
			steps: 28,
			guidance_scale: 3.5,
		},
	},
	{
		id: 'black-forest-labs/FLUX.1-schnell',
		name: 'FLUX.1 Schnell (Fast)',
		description: 'Fast FLUX variant (4 steps)',
		provider: 'huggingface',
		defaultParams: {
			width: 1024,
			height: 1024,
			steps: 4,
			guidance_scale: 0,
		},
	},
	{
		id: 'stabilityai/stable-diffusion-xl-base-1.0',
		name: 'Stable Diffusion XL',
		description: 'High-resolution SDXL model',
		provider: 'huggingface',
		defaultParams: {
			width: 1024,
			height: 1024,
			steps: 30,
			guidance_scale: 7.5,
		},
	},
	{
		id: 'stabilityai/stable-diffusion-3-medium-diffusers',
		name: 'Stable Diffusion 3 Medium',
		description: 'Latest SD3 with improved text rendering',
		provider: 'huggingface',
		defaultParams: {
			width: 1024,
			height: 1024,
			steps: 28,
			guidance_scale: 7.0,
		},
	},
	{
		id: 'runwayml/stable-diffusion-v1-5',
		name: 'Stable Diffusion 1.5',
		description: 'Classic SD 1.5, fast and reliable',
		provider: 'huggingface',
		defaultParams: {
			width: 512,
			height: 512,
			steps: 25,
			guidance_scale: 7.5,
		},
	},
	// Stability AI Direct API
	{
		id: 'stable-diffusion-ultra',
		name: 'Stable Diffusion Ultra',
		description: "Stability AI's Ultra model (direct API)",
		provider: 'stability',
		defaultParams: {
			width: 1024,
			height: 1024,
			cfg_scale: 7.0,
		},
	},
	{
		id: 'stable-diffusion-core',
		name: 'Stable Diffusion Core',
		description: "Stability AI's Core model (direct API)",
		provider: 'stability',
		defaultParams: {
			width: 1024,
			height: 1024,
			cfg_scale: 7.0,
		},
	},
];

export interface GeneratedImage {
	id: string;
	prompt: string;
	enhancedPrompt?: string;
	modelId: string;
	provider: ImageProvider;
	imageData: string; // base64 data URL
	timestamp: number;
	parameters: {
		width: number;
		height: number;
		steps?: number;
		guidance_scale?: number;
		cfg_scale?: number;
		negative_prompt?: string;
		sampler?: string;
	};
}

export interface ImageGenerationProgress {
	status: 'queued' | 'processing' | 'completed' | 'failed';
	message: string;
	progress?: number;
}

export interface ProviderConfig {
	openaiApiKey?: string;
	huggingfaceApiKey?: string;
	stabilityApiKey?: string;
	openaiCompatibleEndpoint?: string;
	openaiCompatibleApiKey?: string;
	automatic1111Endpoint?: string;
	comfyuiEndpoint?: string;
}

export interface GenerateImageOptions {
	prompt: string;
	modelId: string;
	providerConfig: ProviderConfig;
	width?: number;
	height?: number;
	steps?: number;
	guidance_scale?: number;
	cfg_scale?: number;
	negative_prompt?: string;
	num_images?: number;
	sampler?: string;
	quality?: 'standard' | 'hd';
	style?: 'vivid' | 'natural';
}

export class ImageGenerationService {
	private static instance: ImageGenerationService;
	private generatedImages: GeneratedImage[] = [];
	private currentGeneration: AbortController | null = null;

	private readonly _onImageGenerated = new Emitter<GeneratedImage>();
	private readonly _onProgressUpdate = new Emitter<ImageGenerationProgress>();
	private readonly _onError = new Emitter<{ message: string; error: Error | null }>();

	public readonly onImageGenerated: Event<GeneratedImage> = this._onImageGenerated.event;
	public readonly onProgressUpdate: Event<ImageGenerationProgress> = this._onProgressUpdate.event;
	public readonly onError: Event<{ message: string; error: Error | null }> = this._onError.event;

	private constructor() {}

	public static getInstance(): ImageGenerationService {
		if (!ImageGenerationService.instance) {
			ImageGenerationService.instance = new ImageGenerationService();
		}
		return ImageGenerationService.instance;
	}

	public async generateImage(options: GenerateImageOptions): Promise<GeneratedImage> {
		const model = AVAILABLE_IMAGE_MODELS.find((m) => m.id === options.modelId);
		if (!model) {
			throw new Error(`Unknown model: ${options.modelId}`);
		}

		if (this.currentGeneration) {
			this.currentGeneration.abort();
		}
		this.currentGeneration = new AbortController();

		try {
			switch (model.provider) {
				case 'openai':
					return await this.generateOpenAI(options, model);
				case 'huggingface':
					return await this.generateHuggingFace(options, model);
				case 'stability':
					return await this.generateStability(options, model);
				case 'openai-compatible':
					return await this.generateOpenAICompatible(options, model);
				case 'automatic1111':
					return await this.generateAutomatic1111(options, model);
				case 'comfyui':
					return await this.generateComfyUI(options, model);
				default:
					throw new Error(`Unsupported provider: ${model.provider}`);
			}
		} finally {
			this.currentGeneration = null;
		}
	}

	private async generateOpenAI(options: GenerateImageOptions, model: ImageGenerationModel): Promise<GeneratedImage> {
		const apiKey = options.providerConfig.openaiApiKey;
		if (!apiKey) throw new Error('OpenAI API key required');

		this._onProgressUpdate.fire({ status: 'processing', message: 'Generating with OpenAI...', progress: 10 });

		const size = this.getOpenAISize(options.width || 1024, options.height || 1024);

		const payload: Record<string, unknown> = {
			model: options.modelId,
			prompt: options.prompt,
			n: options.num_images || 1,
			size: size,
		};

		if (options.quality && options.modelId === 'dall-e-3') {
			payload.quality = options.quality;
		}
		if (options.style && options.modelId === 'dall-e-3') {
			payload.style = options.style;
		}

		const response = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: this.currentGeneration?.signal,
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI error: ${error}`);
		}

		this._onProgressUpdate.fire({ status: 'processing', message: 'Processing image...', progress: 80 });

		const data = await response.json();
		const imageUrl = data.data[0].url;

		const imageBlob = await fetch(imageUrl).then((r) => r.blob());
		const imageData = await this.blobToDataURL(imageBlob);

		return this.createGeneratedImage(options, model, imageData);
	}

	private async generateHuggingFace(
		options: GenerateImageOptions,
		model: ImageGenerationModel
	): Promise<GeneratedImage> {
		const apiKey = options.providerConfig.huggingfaceApiKey;
		if (!apiKey) throw new Error('HuggingFace API key required');

		this._onProgressUpdate.fire({ status: 'processing', message: `Generating with ${model.name}...`, progress: 10 });

		const payload: Record<string, unknown> = {
			inputs: options.prompt,
			parameters: {},
		};

		if (options.width) payload.parameters.width = options.width;
		if (options.height) payload.parameters.height = options.height;
		if (options.steps) payload.parameters.num_inference_steps = options.steps;
		if (options.guidance_scale) payload.parameters.guidance_scale = options.guidance_scale;
		if (options.negative_prompt) payload.parameters.negative_prompt = options.negative_prompt;
		if (options.num_images && options.num_images > 1) payload.parameters.num_images_per_prompt = options.num_images;

		const response = await fetch(`https://api-inference.huggingface.co/models/${options.modelId}`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: this.currentGeneration?.signal,
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorMessage = `HuggingFace error: ${response.status}`;

			try {
				const errorJson = JSON.parse(errorText);
				if (errorJson.error) {
					errorMessage = errorJson.error;
					if (errorJson.estimated_time) {
						const waitTime = Math.ceil(errorJson.estimated_time);
						throw new Error(`Model loading. Wait ${waitTime}s and retry.`);
					}
				}
			} catch (e) {
				if (e instanceof Error && e.message.includes('Model loading')) throw e;
			}

			throw new Error(errorMessage);
		}

		this._onProgressUpdate.fire({ status: 'processing', message: 'Processing image...', progress: 80 });

		const imageBlob = await response.blob();
		const imageData = await this.blobToDataURL(imageBlob);

		return this.createGeneratedImage(options, model, imageData);
	}

	private async generateStability(options: GenerateImageOptions, model: ImageGenerationModel): Promise<GeneratedImage> {
		const apiKey = options.providerConfig.stabilityApiKey;
		if (!apiKey) throw new Error('Stability AI API key required');

		this._onProgressUpdate.fire({ status: 'processing', message: 'Generating with Stability AI...', progress: 10 });

		const formData = new FormData();
		formData.append('prompt', options.prompt);
		if (options.negative_prompt) formData.append('negative_prompt', options.negative_prompt);
		if (options.cfg_scale || options.guidance_scale) {
			formData.append('cfg_scale', String(options.cfg_scale || options.guidance_scale || 7.0));
		}
		if (options.width) formData.append('width', String(options.width));
		if (options.height) formData.append('height', String(options.height));
		if (options.sampler) formData.append('sampler', options.sampler);
		formData.append('samples', String(options.num_images || 1));

		const endpoint = options.modelId.includes('ultra')
			? 'https://api.stability.ai/v2beta/stable-image/generate/ultra'
			: 'https://api.stability.ai/v2beta/stable-image/generate/core';

		const response = await fetch(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				Accept: 'application/json',
			},
			body: formData,
			signal: this.currentGeneration?.signal,
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Stability AI error: ${error}`);
		}

		this._onProgressUpdate.fire({ status: 'processing', message: 'Processing image...', progress: 80 });

		const data = await response.json();
		const base64Image = data.image || data.artifacts?.[0]?.base64;

		if (!base64Image) throw new Error('No image returned from Stability AI');

		const imageData = `data:image/png;base64,${base64Image}`;
		return this.createGeneratedImage(options, model, imageData);
	}

	private async generateOpenAICompatible(
		options: GenerateImageOptions,
		model: ImageGenerationModel
	): Promise<GeneratedImage> {
		const endpoint = options.providerConfig.openaiCompatibleEndpoint;
		const apiKey = options.providerConfig.openaiCompatibleApiKey || 'noop';

		if (!endpoint) throw new Error('OpenAI-compatible endpoint required');

		this._onProgressUpdate.fire({ status: 'processing', message: 'Generating image...', progress: 10 });

		const size = `${options.width || 1024}x${options.height || 1024}`;

		const response = await fetch(`${endpoint}/v1/images/generations`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				prompt: options.prompt,
				n: options.num_images || 1,
				size: size,
			}),
			signal: this.currentGeneration?.signal,
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`API error: ${error}`);
		}

		this._onProgressUpdate.fire({ status: 'processing', message: 'Processing image...', progress: 80 });

		const data = await response.json();
		const imageUrl = data.data[0].url || data.data[0].b64_json;

		let imageData: string;
		if (imageUrl.startsWith('http')) {
			const imageBlob = await fetch(imageUrl).then((r) => r.blob());
			imageData = await this.blobToDataURL(imageBlob);
		} else {
			imageData = `data:image/png;base64,${imageUrl}`;
		}

		return this.createGeneratedImage(options, model, imageData);
	}

	private async generateAutomatic1111(
		options: GenerateImageOptions,
		model: ImageGenerationModel
	): Promise<GeneratedImage> {
		const endpoint = options.providerConfig.automatic1111Endpoint;
		if (!endpoint) throw new Error('Automatic1111 endpoint required (e.g., http://localhost:7860)');

		this._onProgressUpdate.fire({ status: 'processing', message: 'Generating with Automatic1111...', progress: 10 });

		const payload = {
			prompt: options.prompt,
			negative_prompt: options.negative_prompt || '',
			steps: options.steps || 20,
			cfg_scale: options.cfg_scale || options.guidance_scale || 7.0,
			width: options.width || 512,
			height: options.height || 512,
			sampler_name: options.sampler || 'Euler a',
			n_iter: options.num_images || 1,
		};

		const response = await fetch(`${endpoint}/sdapi/v1/txt2img`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			signal: this.currentGeneration?.signal,
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Automatic1111 error: ${error}`);
		}

		this._onProgressUpdate.fire({ status: 'processing', message: 'Processing image...', progress: 80 });

		const data = await response.json();
		const base64Image = data.images[0];
		const imageData = `data:image/png;base64,${base64Image}`;

		return this.createGeneratedImage(options, model, imageData);
	}

	private async generateComfyUI(options: GenerateImageOptions, model: ImageGenerationModel): Promise<GeneratedImage> {
		const endpoint = options.providerConfig.comfyuiEndpoint;
		if (!endpoint) throw new Error('ComfyUI endpoint required (e.g., http://localhost:8188)');

		this._onProgressUpdate.fire({ status: 'processing', message: 'Generating with ComfyUI...', progress: 10 });

		const workflow = {
			prompt: {
				'3': {
					inputs: {
						seed: Math.floor(Math.random() * 1000000000),
						steps: options.steps || 20,
						cfg: options.cfg_scale || options.guidance_scale || 7.0,
						sampler_name: options.sampler || 'euler',
						scheduler: 'normal',
						denoise: 1,
						model: ['4', 0],
						positive: ['6', 0],
						negative: ['7', 0],
						latent_image: ['5', 0],
					},
					class_type: 'KSampler',
				},
				'4': { inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' }, class_type: 'CheckpointLoaderSimple' },
				'5': {
					inputs: { width: options.width || 1024, height: options.height || 1024, batch_size: 1 },
					class_type: 'EmptyLatentImage',
				},
				'6': { inputs: { text: options.prompt, clip: ['4', 1] }, class_type: 'CLIPTextEncode' },
				'7': { inputs: { text: options.negative_prompt || '', clip: ['4', 1] }, class_type: 'CLIPTextEncode' },
				'8': { inputs: { samples: ['3', 0], vae: ['4', 2] }, class_type: 'VAEDecode' },
				'9': { inputs: { filename_prefix: 'GRID', images: ['8', 0] }, class_type: 'SaveImage' },
			},
		};

		const promptResponse = await fetch(`${endpoint}/prompt`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(workflow),
			signal: this.currentGeneration?.signal,
		});

		if (!promptResponse.ok) throw new Error('ComfyUI prompt submission failed');

		const { prompt_id } = await promptResponse.json();

		await this.pollComfyUIStatus(endpoint, prompt_id);

		this._onProgressUpdate.fire({ status: 'processing', message: 'Downloading image...', progress: 90 });

		const historyResponse = await fetch(`${endpoint}/history/${prompt_id}`);
		const history = await historyResponse.json();
		const output = history[prompt_id].outputs['9'];
		const imagePath = output.images[0].filename;

		const imageResponse = await fetch(`${endpoint}/view?filename=${imagePath}`);
		const imageBlob = await imageResponse.blob();
		const imageData = await this.blobToDataURL(imageBlob);

		return this.createGeneratedImage(options, model, imageData);
	}

	private async pollComfyUIStatus(endpoint: string, promptId: string): Promise<void> {
		const maxAttempts = 60;
		for (let i = 0; i < maxAttempts; i++) {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const response = await fetch(`${endpoint}/history/${promptId}`);
			const history = await response.json();

			if (history[promptId]?.status?.completed) {
				return;
			}

			const progress = Math.min(10 + (i / maxAttempts) * 70, 80);
			this._onProgressUpdate.fire({ status: 'processing', message: 'Generating...', progress });
		}
		throw new Error('ComfyUI generation timeout');
	}

	private createGeneratedImage(
		options: GenerateImageOptions,
		model: ImageGenerationModel,
		imageData: string
	): GeneratedImage {
		const image: GeneratedImage = {
			id: this.generateId(),
			prompt: options.prompt,
			modelId: options.modelId,
			provider: model.provider,
			imageData,
			timestamp: Date.now(),
			parameters: {
				width: options.width || model.defaultParams.width,
				height: options.height || model.defaultParams.height,
				steps: options.steps,
				guidance_scale: options.guidance_scale,
				cfg_scale: options.cfg_scale,
				negative_prompt: options.negative_prompt,
				sampler: options.sampler,
			},
		};

		this.generatedImages.unshift(image);
		if (this.generatedImages.length > 50) {
			this.generatedImages = this.generatedImages.slice(0, 50);
		}

		this._onProgressUpdate.fire({ status: 'completed', message: 'Image generated!', progress: 100 });
		this._onImageGenerated.fire(image);

		return image;
	}

	private getOpenAISize(width: number, height: number): string {
		if (width === 1024 && height === 1024) return '1024x1024';
		if (width === 1024 && height === 1792) return '1024x1792';
		if (width === 1792 && height === 1024) return '1792x1024';
		return '1024x1024';
	}

	private blobToDataURL(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	private generateId(): string {
		return `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	public async enhancePrompt(
		originalPrompt: string,
		apiKey: string,
		style: 'realistic' | 'artistic' | 'technical' | 'creative' = 'creative'
	): Promise<string> {
		if (!originalPrompt?.trim()) throw new Error('Prompt cannot be empty');

		try {
			const systemPrompt = this.getEnhancementSystemPrompt(style);
			const response = await fetch(
				'https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3.1-8B-Instruct/v1/chat/completions',
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({
						messages: [
							{ role: 'system', content: systemPrompt },
							{ role: 'user', content: `Enhance: "${originalPrompt}"` },
						],
						max_tokens: 200,
						temperature: 0.7,
					}),
				}
			);

			if (!response.ok) return this.basicPromptEnhancement(originalPrompt, style);

			const data = await response.json();
			let enhanced = data.choices?.[0]?.message?.content?.trim();
			if (!enhanced) return this.basicPromptEnhancement(originalPrompt, style);

			enhanced = enhanced
				.replace(/^["']|["']$/g, '')
				.replace(/^(Enhanced prompt:|Prompt:|Result:)\s*/i, '')
				.trim();
			return enhanced;
		} catch {
			return this.basicPromptEnhancement(originalPrompt, style);
		}
	}

	private getEnhancementSystemPrompt(style: string): string {
		const guides: Record<string, string> = {
			realistic: 'Add photorealistic details: lighting, camera settings, materials, atmosphere.',
			artistic: 'Add artistic style, composition, color palette, mood, creative techniques.',
			technical: 'Add technical specs: 8k, octane render, precise descriptions, artistic terms.',
			creative: 'Balance detail with creativity. Add imaginative, atmospheric, colorful descriptions.',
		};
		return `You enhance image prompts. ${guides[style] || guides.creative} Keep core concept. Add 2-3 elements. Be concise. Return ONLY enhanced prompt.`;
	}

	private basicPromptEnhancement(prompt: string, style: string): string {
		const terms: Record<string, string[]> = {
			realistic: ['highly detailed', 'photorealistic', 'professional photography'],
			artistic: ['beautiful composition', 'artistic style', 'vibrant colors'],
			technical: ['8k resolution', 'highly detailed', 'octane render'],
			creative: ['imaginative', 'stunning', 'atmospheric'],
		};
		return `${prompt}, ${(terms[style] || terms.creative).slice(0, 3).join(', ')}`;
	}

	public cancelGeneration(): void {
		this.currentGeneration?.abort();
		this.currentGeneration = null;
	}

	public getHistory(): GeneratedImage[] {
		return [...this.generatedImages];
	}
	public clearHistory(): void {
		this.generatedImages = [];
	}
	public deleteImage(id: string): void {
		this.generatedImages = this.generatedImages.filter((img) => img.id !== id);
	}

	public async downloadImage(image: GeneratedImage, filename?: string): Promise<void> {
		const name = filename || `grid-image-${image.id}.png`;
		const response = await fetch(image.imageData);
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = name;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	public async copyToClipboard(image: GeneratedImage): Promise<void> {
		const response = await fetch(image.imageData);
		const blob = await response.blob();
		await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
	}

	public getModel(id: string): ImageGenerationModel | undefined {
		return AVAILABLE_IMAGE_MODELS.find((m) => m.id === id);
	}

	public getAvailableModels(): ImageGenerationModel[] {
		return [...AVAILABLE_IMAGE_MODELS];
	}

	public getModelsByProvider(provider: ImageProvider): ImageGenerationModel[] {
		return AVAILABLE_IMAGE_MODELS.filter((m) => m.provider === provider);
	}
}

export const imageGenerationService = ImageGenerationService.getInstance();
