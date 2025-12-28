/*---------------------------------------------------------------------------------------------
 *  Copyright (c) 2025 Millsy.dev. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Sparkles, Download, Copy, Trash2, Settings, Image as ImageIcon, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { imageGenerationService, GeneratedImage, ImageGenerationModel, ImageGenerationProgress, AVAILABLE_IMAGE_MODELS, ImageProvider } from '../../../../common/imageGenerationService.js';

interface Props {
	onClose: () => void;
}

interface APIKeys {
	openai?: string;
	huggingface?: string;
	stability?: string;
	openaiCompatibleEndpoint?: string;
	openaiCompatibleApiKey?: string;
	automatic1111Endpoint?: string;
	comfyuiEndpoint?: string;
}

export const ImageGenerationPanel = ({ onClose }: Props) => {
	const [prompt, setPrompt] = useState('');
	const [enhancedPrompt, setEnhancedPrompt] = useState('');
	const [negativePrompt, setNegativePrompt] = useState('');
	const [selectedModel, setSelectedModel] = useState(AVAILABLE_IMAGE_MODELS[0].id);
	const [isGenerating, setIsGenerating] = useState(false);
	const [progress, setProgress] = useState<ImageGenerationProgress | null>(null);
	const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
	const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [isEnhancing, setIsEnhancing] = useState(false);

	// API Keys
	const [apiKeys, setApiKeys] = useState<APIKeys>(() => {
		const saved = localStorage.getItem('grid-image-gen-api-keys');
		return saved ? JSON.parse(saved) : {};
	});

	// Advanced settings
	const [width, setWidth] = useState(1024);
	const [height, setHeight] = useState(1024);
	const [steps, setSteps] = useState(28);
	const [guidanceScale, setGuidanceScale] = useState(7.5);
	const [cfgScale, setCfgScale] = useState(7.0);
	const [sampler, setSampler] = useState('Euler a');
	const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
	const [style, setStyle] = useState<'vivid' | 'natural'>('vivid');
	const [enhancementStyle, setEnhancementStyle] = useState<'realistic' | 'artistic' | 'technical' | 'creative'>('creative');

	const promptInputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		localStorage.setItem('grid-image-gen-api-keys', JSON.stringify(apiKeys));
	}, [apiKeys]);

	useEffect(() => {
		const history = imageGenerationService.getHistory();
		setGeneratedImages(history);

		const progressDisposable = imageGenerationService.onProgressUpdate(prog => {
			setProgress(prog);
		});

		const imageDisposable = imageGenerationService.onImageGenerated(img => {
			setGeneratedImages(prev => [img, ...prev]);
			setSelectedImage(img);
		});

		const errorDisposable = imageGenerationService.onError(({ message }) => {
			alert(`Error: ${message}`);
		});

		return () => {
			progressDisposable.dispose();
			imageDisposable.dispose();
			errorDisposable.dispose();
		};
	}, []);

	useEffect(() => {
		const model = imageGenerationService.getModel(selectedModel);
		if (model) {
			setWidth(model.defaultParams.width);
			setHeight(model.defaultParams.height);
			if (model.defaultParams.steps) setSteps(model.defaultParams.steps);
			if (model.defaultParams.guidance_scale) setGuidanceScale(model.defaultParams.guidance_scale);
			if (model.defaultParams.cfg_scale) setCfgScale(model.defaultParams.cfg_scale);
		}
	}, [selectedModel]);

	const getRequiredApiKey = useCallback((): { provider: ImageProvider; key: string | undefined } => {
		const model = imageGenerationService.getModel(selectedModel);
		if (!model) return { provider: 'huggingface', key: undefined };

		switch (model.provider) {
			case 'openai':
				return { provider: 'openai', key: apiKeys.openai };
			case 'huggingface':
				return { provider: 'huggingface', key: apiKeys.huggingface };
			case 'stability':
				return { provider: 'stability', key: apiKeys.stability };
			case 'openai-compatible':
				return { provider: 'openai-compatible', key: apiKeys.openaiCompatibleApiKey };
			case 'automatic1111':
				return { provider: 'automatic1111', key: apiKeys.automatic1111Endpoint };
			case 'comfyui':
				return { provider: 'comfyui', key: apiKeys.comfyuiEndpoint };
			default:
				return { provider: model.provider, key: undefined };
		}
	}, [selectedModel, apiKeys]);

	const handleEnhancePrompt = async () => {
		if (!prompt.trim()) return;

		const { key } = getRequiredApiKey();
		if (!key) {
			alert('Please configure API keys in settings');
			setShowSettings(true);
			return;
		}

		setIsEnhancing(true);
		try {
			const enhanced = await imageGenerationService.enhancePrompt(prompt, key, enhancementStyle);
			setEnhancedPrompt(enhanced);
			setPrompt(enhanced);
		} catch (error) {
			alert(`Failed to enhance prompt: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsEnhancing(false);
		}
	};

	const handleGenerate = async () => {
		if (!prompt.trim()) {
			alert('Please enter a prompt');
			return;
		}

		const { provider, key } = getRequiredApiKey();
		if (!key) {
			alert(`Please configure ${provider} API key/endpoint in settings`);
			setShowSettings(true);
			return;
		}

		setIsGenerating(true);
		setProgress(null);

		try {
			await imageGenerationService.generateImage({
				prompt: prompt.trim(),
				modelId: selectedModel,
				providerConfig: {
					openaiApiKey: apiKeys.openai,
					huggingfaceApiKey: apiKeys.huggingface,
					stabilityApiKey: apiKeys.stability,
					openaiCompatibleEndpoint: apiKeys.openaiCompatibleEndpoint,
					openaiCompatibleApiKey: apiKeys.openaiCompatibleApiKey,
					automatic1111Endpoint: apiKeys.automatic1111Endpoint,
					comfyuiEndpoint: apiKeys.comfyuiEndpoint
				},
				width,
				height,
				steps: steps || undefined,
				guidance_scale: guidanceScale || undefined,
				cfg_scale: cfgScale || undefined,
				negative_prompt: negativePrompt || undefined,
				sampler: sampler || undefined,
				quality,
				style
			});
		} catch (error) {
			console.error('Generation error:', error);
		} finally {
			setIsGenerating(false);
			setProgress(null);
		}
	};

	const handleDownload = (image: GeneratedImage) => {
		imageGenerationService.downloadImage(image);
	};

	const handleCopy = async (image: GeneratedImage) => {
		try {
			await imageGenerationService.copyToClipboard(image);
			alert('Image copied to clipboard!');
		} catch (error) {
			alert(`Failed to copy: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	const handleDelete = (imageId: string) => {
		if (confirm('Delete this image?')) {
			imageGenerationService.deleteImage(imageId);
			setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
			if (selectedImage?.id === imageId) {
				setSelectedImage(null);
			}
		}
	};

	const handleCancel = () => {
		imageGenerationService.cancelGeneration();
		setIsGenerating(false);
		setProgress(null);
	};

	const modelsByProvider = AVAILABLE_IMAGE_MODELS.reduce((acc, model) => {
		if (!acc[model.provider]) acc[model.provider] = [];
		acc[model.provider].push(model);
		return acc;
	}, {} as Record<ImageProvider, ImageGenerationModel[]>);

	const providerNames: Record<ImageProvider, string> = {
		openai: 'OpenAI',
		huggingface: 'HuggingFace',
		stability: 'Stability AI',
		'openai-compatible': 'OpenAI Compatible',
		automatic1111: 'Automatic1111',
		comfyui: 'ComfyUI'
	};

	return (
		<div className="grid-fixed grid-inset-0 grid-z-50 grid-flex grid-items-center grid-justify-center grid-bg-black/80">
			<div className="grid-relative grid-w-[95vw] grid-h-[95vh] grid-max-w-7xl grid-bg-gradient-to-br grid-from-grid-bg-0 grid-to-grid-bg-1 grid-rounded-lg grid-border grid-border-grid-border-2 grid-shadow-2xl grid-flex grid-flex-col grid-overflow-hidden">

				{/* Header */}
				<div className="grid-flex grid-items-center grid-justify-between grid-px-6 grid-py-4 grid-border-b grid-border-grid-border-2 grid-bg-gradient-to-r grid-from-grid-bg-1 grid-to-grid-bg-0">
					<div className="grid-flex grid-items-center grid-gap-3">
						<div className="grid-w-10 grid-h-10 grid-rounded-lg grid-bg-grid-primary/20 grid-flex grid-items-center grid-justify-center">
							<ImageIcon className="grid-w-5 grid-h-5 grid-text-grid-primary" />
						</div>
						<div>
							<h2 className="grid-text-lg grid-font-semibold grid-text-grid-text-0">AI Image Generation</h2>
							<p className="grid-text-xs grid-text-grid-text-2">Create images with AI - supports multiple providers</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="grid-p-2 hover:grid-bg-grid-bg-2 grid-rounded grid-transition-colors"
					>
						<X className="grid-w-5 grid-h-5 grid-text-grid-text-1" />
					</button>
				</div>

				<div className="grid-flex-1 grid-flex grid-overflow-hidden">
					{/* Left Panel - Controls */}
					<div className="grid-w-[400px] grid-border-r grid-border-grid-border-2 grid-flex grid-flex-col grid-overflow-y-auto">
						<div className="grid-p-6 grid-space-y-4">

							{/* Model Selection */}
							<div>
								<label className="grid-block grid-text-sm grid-font-medium grid-text-grid-text-0 grid-mb-2">
									Model
								</label>
								<select
									value={selectedModel}
									onChange={(e) => setSelectedModel(e.target.value)}
									className="grid-w-full grid-px-3 grid-py-2 grid-bg-grid-bg-2 grid-border grid-border-grid-border-2 grid-rounded grid-text-sm grid-text-grid-text-0 focus:grid-outline-none focus:grid-border-grid-primary"
								>
									{Object.entries(modelsByProvider).map(([provider, models]) => (
										<optgroup key={provider} label={providerNames[provider as ImageProvider]}>
											{models.map(model => (
												<option key={model.id} value={model.id}>
													{model.name}
												</option>
											))}
										</optgroup>
									))}
								</select>
								<p className="grid-text-xs grid-text-grid-text-2 grid-mt-1">
									{imageGenerationService.getModel(selectedModel)?.description}
								</p>
							</div>

							{/* Prompt Input */}
							<div>
								<label className="grid-block grid-text-sm grid-font-medium grid-text-grid-text-0 grid-mb-2">
									Prompt
								</label>
								<textarea
									ref={promptInputRef}
									value={prompt}
									onChange={(e) => setPrompt(e.target.value)}
									placeholder="Describe the image you want to generate..."
									className="grid-w-full grid-h-24 grid-px-3 grid-py-2 grid-bg-grid-bg-2 grid-border grid-border-grid-border-2 grid-rounded grid-text-sm grid-text-grid-text-0 grid-resize-none focus:grid-outline-none focus:grid-border-grid-primary"
								/>
								<div className="grid-flex grid-items-center grid-gap-2 grid-mt-2">
									<button
										onClick={handleEnhancePrompt}
										disabled={isEnhancing || !prompt.trim()}
										className="grid-flex-1 grid-flex grid-items-center grid-justify-center grid-gap-2 grid-px-3 grid-py-2 grid-bg-gradient-to-r grid-from-purple-600 grid-to-pink-600 hover:grid-from-purple-700 hover:grid-to-pink-700 disabled:grid-opacity-50 disabled:grid-cursor-not-allowed grid-rounded grid-text-sm grid-text-white grid-font-medium grid-transition-all"
									>
										{isEnhancing ? (
											<Loader2 className="grid-w-4 grid-h-4 grid-animate-spin" />
										) : (
											<Sparkles className="grid-w-4 grid-h-4" />
										)}
										{isEnhancing ? 'Enhancing...' : 'Enhance Prompt'}
									</button>
									<select
										value={enhancementStyle}
										onChange={(e) => setEnhancementStyle(e.target.value as any)}
										className="grid-px-3 grid-py-2 grid-bg-grid-bg-2 grid-border grid-border-grid-border-2 grid-rounded grid-text-sm grid-text-grid-text-0"
									>
										<option value="creative">Creative</option>
										<option value="realistic">Realistic</option>
										<option value="artistic">Artistic</option>
										<option value="technical">Technical</option>
									</select>
								</div>
							</div>

							{/* Negative Prompt */}
							<div>
								<label className="grid-block grid-text-sm grid-font-medium grid-text-grid-text-0 grid-mb-2">
									Negative Prompt (Optional)
								</label>
								<textarea
									value={negativePrompt}
									onChange={(e) => setNegativePrompt(e.target.value)}
									placeholder="What to avoid in the image..."
									className="grid-w-full grid-h-16 grid-px-3 grid-py-2 grid-bg-grid-bg-2 grid-border grid-border-grid-border-2 grid-rounded grid-text-sm grid-text-grid-text-0 grid-resize-none focus:grid-outline-none focus:grid-border-grid-primary"
								/>
							</div>

							{/* Settings Toggle */}
							<button
								onClick={() => setShowSettings(!showSettings)}
								className="grid-w-full grid-flex grid-items-center grid-justify-between grid-px-3 grid-py-2 grid-bg-grid-bg-2 hover:grid-bg-grid-bg-3 grid-rounded grid-text-sm grid-text-grid-text-0 grid-transition-colors"
							>
								<div className="grid-flex grid-items-center grid-gap-2">
									<Settings className="grid-w-4 grid-h-4" />
									<span>Advanced Settings & API Keys</span>
								</div>
								{showSettings ? <ChevronUp className="grid-w-4 grid-h-4" /> : <ChevronDown className="grid-w-4 grid-h-4" />}
							</button>

							{/* Advanced Settings */}
							{showSettings && (
								<div className="grid-space-y-4 grid-p-4 grid-bg-grid-bg-2 grid-rounded grid-border grid-border-grid-border-2">
									<h3 className="grid-text-sm grid-font-semibold grid-text-grid-text-0 grid-border-b grid-border-grid-border-2 grid-pb-2">API Keys</h3>

									<div>
										<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">OpenAI API Key</label>
										<input
											type="password"
											value={apiKeys.openai || ''}
											onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
											placeholder="sk-..."
											className="grid-w-full grid-px-2 grid-py-1.5 grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 grid-rounded grid-text-xs"
										/>
									</div>

									<div>
										<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">HuggingFace API Key</label>
										<input
											type="password"
											value={apiKeys.huggingface || ''}
											onChange={(e) => setApiKeys(prev => ({ ...prev, huggingface: e.target.value }))}
											placeholder="hf_..."
											className="grid-w-full grid-px-2 grid-py-1.5 grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 grid-rounded grid-text-xs"
										/>
									</div>

									<div>
										<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">Stability AI API Key</label>
										<input
											type="password"
											value={apiKeys.stability || ''}
											onChange={(e) => setApiKeys(prev => ({ ...prev, stability: e.target.value }))}
											placeholder="sk-..."
											className="grid-w-full grid-px-2 grid-py-1.5 grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 grid-rounded grid-text-xs"
										/>
									</div>

									<div>
										<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">Automatic1111 Endpoint</label>
										<input
											type="text"
											value={apiKeys.automatic1111Endpoint || ''}
											onChange={(e) => setApiKeys(prev => ({ ...prev, automatic1111Endpoint: e.target.value }))}
											placeholder="http://localhost:7860"
											className="grid-w-full grid-px-2 grid-py-1.5 grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 grid-rounded grid-text-xs"
										/>
									</div>

									<div>
										<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">ComfyUI Endpoint</label>
										<input
											type="text"
											value={apiKeys.comfyuiEndpoint || ''}
											onChange={(e) => setApiKeys(prev => ({ ...prev, comfyuiEndpoint: e.target.value }))}
											placeholder="http://localhost:8188"
											className="grid-w-full grid-px-2 grid-py-1.5 grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 grid-rounded grid-text-xs"
										/>
									</div>

									<h3 className="grid-text-sm grid-font-semibold grid-text-grid-text-0 grid-border-b grid-border-grid-border-2 grid-pb-2 grid-mt-4">Generation Parameters</h3>

									<div className="grid-grid grid-grid-cols-2 grid-gap-3">
										<div>
											<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">Width: {width}px</label>
											<input
												type="range"
												min="256"
												max="2048"
												step="64"
												value={width}
												onChange={(e) => setWidth(Number(e.target.value))}
												className="grid-w-full"
											/>
										</div>
										<div>
											<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">Height: {height}px</label>
											<input
												type="range"
												min="256"
												max="2048"
												step="64"
												value={height}
												onChange={(e) => setHeight(Number(e.target.value))}
												className="grid-w-full"
											/>
										</div>
									</div>

									<div>
										<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">Steps: {steps}</label>
										<input
											type="range"
											min="1"
											max="100"
											value={steps}
											onChange={(e) => setSteps(Number(e.target.value))}
											className="grid-w-full"
										/>
									</div>

									<div>
										<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">Guidance Scale: {guidanceScale}</label>
										<input
											type="range"
											min="1"
											max="20"
											step="0.5"
											value={guidanceScale}
											onChange={(e) => setGuidanceScale(Number(e.target.value))}
											className="grid-w-full"
										/>
									</div>

									<div>
										<label className="grid-block grid-text-xs grid-text-grid-text-1 grid-mb-1">Sampler</label>
										<select
											value={sampler}
											onChange={(e) => setSampler(e.target.value)}
											className="grid-w-full grid-px-2 grid-py-1.5 grid-bg-grid-bg-1 grid-border grid-border-grid-border-2 grid-rounded grid-text-xs"
										>
											<option>Euler a</option>
											<option>Euler</option>
											<option>DPM++ 2M</option>
											<option>DPM++ SDE</option>
											<option>DDIM</option>
										</select>
									</div>
								</div>
							)}

							{/* Generate Button */}
							<button
								onClick={isGenerating ? handleCancel : handleGenerate}
								disabled={!prompt.trim()}
								className="grid-w-full grid-py-3 grid-bg-grid-primary hover:grid-bg-grid-primary/90 disabled:grid-opacity-50 disabled:grid-cursor-not-allowed grid-rounded grid-text-sm grid-font-semibold grid-text-white grid-transition-all grid-shadow-lg hover:grid-shadow-xl"
							>
								{isGenerating ? 'Cancel' : 'Generate Image'}
							</button>

							{/* Progress */}
							{progress && (
								<div className="grid-p-3 grid-bg-grid-bg-2 grid-rounded grid-border grid-border-grid-border-2">
									<div className="grid-flex grid-items-center grid-gap-2 grid-mb-2">
										{progress.status === 'processing' && <Loader2 className="grid-w-4 grid-h-4 grid-animate-spin grid-text-grid-primary" />}
										<span className="grid-text-sm grid-text-grid-text-0">{progress.message}</span>
									</div>
									{progress.progress !== undefined && (
										<div className="grid-w-full grid-h-2 grid-bg-grid-bg-3 grid-rounded-full grid-overflow-hidden">
											<div
												className="grid-h-full grid-bg-grid-primary grid-transition-all grid-duration-300"
												style={{ width: `${progress.progress}%` }}
											/>
										</div>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Right Panel - Gallery */}
					<div className="grid-flex-1 grid-flex grid-flex-col grid-overflow-hidden">
						{selectedImage ? (
							<div className="grid-flex-1 grid-flex grid-flex-col grid-p-6 grid-overflow-hidden">
								<div className="grid-flex grid-items-center grid-justify-between grid-mb-4">
									<h3 className="grid-text-lg grid-font-semibold grid-text-grid-text-0">Generated Image</h3>
									<div className="grid-flex grid-gap-2">
										<button
											onClick={() => handleDownload(selectedImage)}
											className="grid-p-2 hover:grid-bg-grid-bg-2 grid-rounded grid-transition-colors"
											title="Download"
										>
											<Download className="grid-w-4 grid-h-4 grid-text-grid-text-1" />
										</button>
										<button
											onClick={() => handleCopy(selectedImage)}
											className="grid-p-2 hover:grid-bg-grid-bg-2 grid-rounded grid-transition-colors"
											title="Copy to clipboard"
										>
											<Copy className="grid-w-4 grid-h-4 grid-text-grid-text-1" />
										</button>
										<button
											onClick={() => handleDelete(selectedImage.id)}
											className="grid-p-2 hover:grid-bg-red-500/20 grid-rounded grid-transition-colors"
											title="Delete"
										>
											<Trash2 className="grid-w-4 grid-h-4 grid-text-red-500" />
										</button>
									</div>
								</div>

								<div className="grid-flex-1 grid-flex grid-items-center grid-justify-center grid-bg-grid-bg-2 grid-rounded-lg grid-overflow-hidden">
									<img
										src={selectedImage.imageData}
										alt={selectedImage.prompt}
										className="grid-max-w-full grid-max-h-full grid-object-contain"
									/>
								</div>

								<div className="grid-mt-4 grid-p-4 grid-bg-grid-bg-2 grid-rounded-lg grid-border grid-border-grid-border-2">
									<p className="grid-text-sm grid-text-grid-text-0 grid-mb-2"><strong>Prompt:</strong> {selectedImage.prompt}</p>
									<div className="grid-grid grid-grid-cols-2 grid-gap-2 grid-text-xs grid-text-grid-text-2">
										<div>Model: {imageGenerationService.getModel(selectedImage.modelId)?.name}</div>
										<div>Size: {selectedImage.parameters.width}x{selectedImage.parameters.height}</div>
										{selectedImage.parameters.steps && <div>Steps: {selectedImage.parameters.steps}</div>}
										{selectedImage.parameters.guidance_scale && <div>Guidance: {selectedImage.parameters.guidance_scale}</div>}
									</div>
								</div>
							</div>
						) : (
							<div className="grid-flex-1 grid-flex grid-items-center grid-justify-center grid-text-grid-text-2">
								<div className="grid-text-center">
									<ImageIcon className="grid-w-16 grid-h-16 grid-mx-auto grid-mb-4 grid-opacity-50" />
									<p>No image selected</p>
									<p className="grid-text-sm grid-mt-2">Generate an image or select from history</p>
								</div>
							</div>
						)}

						{/* Image History */}
						{generatedImages.length > 0 && (
							<div className="grid-border-t grid-border-grid-border-2 grid-p-4">
								<h3 className="grid-text-sm grid-font-semibold grid-text-grid-text-0 grid-mb-3">History</h3>
								<div className="grid-grid grid-grid-cols-6 grid-gap-2 grid-max-h-40 grid-overflow-y-auto">
									{generatedImages.map(img => (
										<button
											key={img.id}
											onClick={() => setSelectedImage(img)}
											className={`grid-aspect-square grid-rounded grid-overflow-hidden grid-border-2 grid-transition-all hover:grid-scale-105 ${
												selectedImage?.id === img.id ? 'grid-border-grid-primary' : 'grid-border-transparent'
											}`}
										>
											<img src={img.imageData} alt={img.prompt} className="grid-w-full grid-h-full grid-object-cover" />
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
