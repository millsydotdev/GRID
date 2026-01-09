/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { defaultModelsOfProvider, defaultProviderSettings, ModelOverrides } from './modelCapabilities.js';
import { ToolApprovalType } from './toolsServiceTypes.js';
import { GridSettingsState } from './gridSettingsService.js';

type UnionOfKeys<T> = T extends T ? keyof T : never;

export type ProviderName = keyof typeof defaultProviderSettings;
export const providerNames = Object.keys(defaultProviderSettings) as ProviderName[];

export const localProviderNames = ['ollama', 'vLLM', 'lmStudio'] satisfies ProviderName[]; // all local names
export const nonlocalProviderNames = providerNames.filter((name) => !(localProviderNames as string[]).includes(name)); // all non-local names

type CustomSettingName = UnionOfKeys<(typeof defaultProviderSettings)[ProviderName]>;
type CustomProviderSettings<providerName extends ProviderName> = {
	[k in CustomSettingName]: k extends keyof (typeof defaultProviderSettings)[providerName] ? string : undefined;
};
export const customSettingNamesOfProvider = (providerName: ProviderName) => {
	return Object.keys(defaultProviderSettings[providerName]) as CustomSettingName[];
};

export type GridStatefulModelInfo = {
	// <-- STATEFUL
	modelName: string;
	type: 'default' | 'autodetected' | 'custom';
	isHidden: boolean; // whether or not the user is hiding it (switched off)
};

type CommonProviderSettings = {
	_didFillInProviderSettings: boolean | undefined; // undefined initially, computed when user types in all fields
	models: GridStatefulModelInfo[];
};

export type SettingsAtProvider<providerName extends ProviderName> = CustomProviderSettings<providerName> &
	CommonProviderSettings;

// part of state
export type SettingsOfProvider = {
	[providerName in ProviderName]: SettingsAtProvider<providerName>;
};

export type SettingName = keyof SettingsAtProvider<ProviderName>;

type DisplayInfoForProviderName = {
	title: string;
	desc?: string;
	category?: 'Main' | 'Chinese AI' | 'Inference' | 'Enterprise' | 'Aggregators' | 'Specialized' | 'Local';
};

export const displayInfoOfProviderName = (providerName: ProviderName): DisplayInfoForProviderName => {
	// Main
	if (providerName === 'anthropic') {return { title: 'Anthropic', category: 'Main' };}
	if (providerName === 'openAI') {return { title: 'OpenAI', category: 'Main' };}
	if (providerName === 'gemini') {return { title: 'Gemini', category: 'Main' };}
	if (providerName === 'deepseek') {return { title: 'DeepSeek', category: 'Main' };}
	if (providerName === 'xAI') {return { title: 'Grok (xAI)', category: 'Main' };}
	if (providerName === 'mistral') {return { title: 'Mistral', category: 'Main' };}

	// Local
	if (providerName === 'ollama') {return { title: 'Ollama', category: 'Local' };}
	if (providerName === 'vLLM') {return { title: 'vLLM', category: 'Local' };}
	if (providerName === 'lmStudio') {return { title: 'LM Studio', category: 'Local' };}

	// Chinese AI
	if (providerName === 'moonshot') {return { title: 'Moonshot AI (Kimi)', category: 'Chinese AI' };}
	if (providerName === 'zhipu') {return { title: 'Zhipu AI (ChatGLM)', category: 'Chinese AI' };}
	if (providerName === 'baichuan') {return { title: 'Baichuan', category: 'Chinese AI' };}
	if (providerName === 'yi') {return { title: '01.AI (Yi)', category: 'Chinese AI' };}
	if (providerName === 'alibabaCloud') {return { title: 'Alibaba Cloud (Qwen)', category: 'Chinese AI' };}
	if (providerName === 'minimax') {return { title: 'MiniMax', category: 'Chinese AI' };}
	if (providerName === 'siliconflow') {return { title: 'SiliconFlow', category: 'Chinese AI' };}
	if (providerName === 'tencentHunyuan') {return { title: 'Tencent Hunyuan', category: 'Chinese AI' };}
	if (providerName === 'bytedanceDoubao') {return { title: 'ByteDance Doubao', category: 'Chinese AI' };}
	if (providerName === 'stepfun') {return { title: 'StepFun', category: 'Chinese AI' };}
	if (providerName === 'sensetimeNova') {return { title: 'SenseTime Nova', category: 'Chinese AI' };}
	if (providerName === 'iflytekSpark') {return { title: 'iFlytek Spark', category: 'Chinese AI' };}

	// Inference Platforms
	if (providerName === 'groq') {return { title: 'Groq', category: 'Inference' };}
	if (providerName === 'cerebras') {return { title: 'Cerebras', category: 'Inference' };}
	if (providerName === 'cohere') {return { title: 'Cohere', category: 'Inference' };}
	if (providerName === 'sambanova') {return { title: 'SambaNova', category: 'Inference' };}
	if (providerName === 'leptonai') {return { title: 'Lepton AI', category: 'Inference' };}
	if (providerName === 'novitaai') {return { title: 'Novita AI', category: 'Inference' };}
	if (providerName === 'octoai') {return { title: 'OctoAI', category: 'Inference' };}
	if (providerName === 'runpod') {return { title: 'RunPod', category: 'Inference' };}
	if (providerName === 'anyscale') {return { title: 'Anyscale', category: 'Inference' };}
	if (providerName === 'baseten') {return { title: 'Baseten', category: 'Inference' };}
	if (providerName === 'lambdalabs') {return { title: 'Lambda Labs', category: 'Inference' };}
	if (providerName === 'featherless') {return { title: 'Featherless AI', category: 'Inference' };}
	if (providerName === 'gradientai') {return { title: 'Gradient AI', category: 'Inference' };}
	if (providerName === 'predibase') {return { title: 'Predibase', category: 'Inference' };}
	if (providerName === 'nvidiaNim') {return { title: 'NVIDIA NIM', category: 'Inference' };}
	if (providerName === 'databricks') {return { title: 'Databricks', category: 'Inference' };}
	if (providerName === 'modal') {return { title: 'Modal', category: 'Inference' };}
	if (providerName === 'mancer') {return { title: 'Mancer AI', category: 'Inference' };}
	if (providerName === 'deepinfra') {return { title: 'DeepInfra', category: 'Inference' };}
	if (providerName === 'hyperbolic') {return { title: 'Hyperbolic', category: 'Inference' };}
	if (providerName === 'nebius') {return { title: 'Nebius', category: 'Inference' };}
	if (providerName === 'friendliai') {return { title: 'Friendli AI', category: 'Inference' };}

	// Enterprise & Cloud
	if (providerName === 'googleVertex') {return { title: 'Google Vertex AI', category: 'Enterprise' };}
	if (providerName === 'microsoftAzure') {return { title: 'Microsoft Azure', category: 'Enterprise' };}
	if (providerName === 'awsBedrock') {return { title: 'AWS Bedrock', category: 'Enterprise' };}
	if (providerName === 'cloudflareAI') {return { title: 'Cloudflare AI', category: 'Enterprise' };}
	if (providerName === 'rekaai') {return { title: 'Reka AI', category: 'Enterprise' };}
	if (providerName === 'alephalpha') {return { title: 'Aleph Alpha', category: 'Enterprise' };}
	if (providerName === 'writerai') {return { title: 'Writer', category: 'Enterprise' };}
	if (providerName === 'inflectionai') {return { title: 'Inflection AI', category: 'Enterprise' };}
	if (providerName === 'netmindai') {return { title: 'NetMind AI', category: 'Enterprise' };}
	if (providerName === 'inworldai') {return { title: 'Inworld AI', category: 'Enterprise' };}
	if (providerName === 'upstage') {return { title: 'Upstage', category: 'Enterprise' };}
	if (providerName === 'textsynth') {return { title: 'TextSynth', category: 'Enterprise' };}
	if (providerName === 'forefrontai') {return { title: 'Forefront AI', category: 'Enterprise' };}

	// Aggregators
	if (providerName === 'openRouter') {return { title: 'OpenRouter', category: 'Aggregators' };}
	if (providerName === 'huggingFace') {return { title: 'Hugging Face', category: 'Aggregators' };}
	if (providerName === 'liteLLM') {return { title: 'LiteLLM', category: 'Aggregators' };}
	if (providerName === 'openAICompatible') {return { title: 'OpenAI-Compatible', category: 'Aggregators' };}
	if (providerName === 'aimlapi') {return { title: 'AIMLAPI', category: 'Aggregators' };}
	if (providerName === 'poeapi') {return { title: 'Poe API', category: 'Aggregators' };}
	if (providerName === 'edenai') {return { title: 'Eden AI', category: 'Aggregators' };}
	if (providerName === 'unifyai') {return { title: 'Unify AI', category: 'Aggregators' };}
	if (providerName === 'portkey') {return { title: 'Portkey', category: 'Aggregators' };}
	if (providerName === 'martian') {return { title: 'Martian', category: 'Aggregators' };}
	if (providerName === 'nlpcloud') {return { title: 'NLP Cloud', category: 'Aggregators' };}

	// Specialized
	if (providerName === 'voyageai') {return { title: 'Voyage AI', category: 'Specialized' };}
	if (providerName === 'jinaai') {return { title: 'Jina AI', category: 'Specialized' };}
	if (providerName === 'elevenlabs') {return { title: 'ElevenLabs', category: 'Specialized' };}

	// Fallback/Legacy
	if (providerName === 'togetherai') {return { title: 'Together AI', category: 'Inference' };}
	if (providerName === 'fireworksAI') {return { title: 'Fireworks AI', category: 'Inference' };}
	if (providerName === 'replicate') {return { title: 'Replicate', category: 'Inference' };}
	if (providerName === 'perplexity') {return { title: 'Perplexity', category: 'Inference' };}
	if (providerName === 'ai21') {return { title: 'AI21 Labs', category: 'Inference' };}

	throw new Error(`displayInfo: Unknown provider name: "${providerName}"`);
};


export const subTextMdOfProviderName = (providerName: ProviderName): string => {
	if (providerName === 'anthropic') {return 'Get your [API Key here](https://console.anthropic.com/settings/keys).';}
	if (providerName === 'openAI') {return 'Get your [API Key here](https://platform.openai.com/api-keys).';}
	if (providerName === 'deepseek') {return 'Get your [API Key here](https://platform.deepseek.com/api_keys).';}
	if (providerName === 'openRouter')
		{return 'Get your [API Key here](https://openrouter.ai/settings/keys). Read about [rate limits here](https://openrouter.ai/docs/api-reference/limits).';}
	if (providerName === 'gemini')
		{return 'Get your [API Key here](https://aistudio.google.com/apikey). Read about [rate limits here](https://ai.google.dev/gemini-api/docs/rate-limits#current-rate-limits).';}
	if (providerName === 'groq') {return 'Get your [API Key here](https://console.groq.com/keys).';}
	if (providerName === 'xAI') {return 'Get your [API Key here](https://console.x.ai).';}
	if (providerName === 'mistral') {return 'Get your [API Key here](https://console.mistral.ai/api-keys).';}
	if (providerName === 'huggingFace')
		{return 'Get your [API Key here](https://huggingface.co/settings/tokens). Use Inference API with popular open source models.';}
	if (providerName === 'openAICompatible')
		{return `Use any provider that's OpenAI-compatible (use this for llama.cpp and more).`;}
	if (providerName === 'googleVertex')
		{return 'You must authenticate before using Vertex with GRID. Read more about endpoints [here](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library), and regions [here](https://cloud.google.com/vertex-ai/docs/general/locations#available-regions).';}
	if (providerName === 'microsoftAzure')
		{return 'Read more about endpoints [here](https://learn.microsoft.com/en-us/rest/api/aifoundry/model-inference/get-chat-completions/get-chat-completions?view=rest-aifoundry-model-inference-2024-05-01-preview&tabs=HTTP), and get your API key [here](https://learn.microsoft.com/en-us/azure/search/search-security-api-keys?tabs=rest-use%2Cportal-find%2Cportal-query#find-existing-keys).';}
	if (providerName === 'awsBedrock')
		{return 'Connect via a LiteLLM proxy or the AWS [Bedrock-Access-Gateway](https://github.com/aws-samples/bedrock-access-gateway). LiteLLM Bedrock setup docs are [here](https://docs.litellm.ai/docs/providers/bedrock).';}
	if (providerName === 'ollama')
		{return 'Read more about custom [Endpoints here](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-expose-ollama-on-my-network).';}
	if (providerName === 'vLLM')
		{return 'Read more about custom [Endpoints here](https://docs.vllm.ai/en/latest/getting_started/quickstart.html#openai-compatible-server).';}
	if (providerName === 'lmStudio')
		{return 'Read more about custom [Endpoints here](https://lmstudio.ai/docs/app/api/endpoints/openai).';}
	if (providerName === 'liteLLM')
		{return 'Read more about endpoints [here](https://docs.litellm.ai/docs/providers/openai_compatible).';}
	if (providerName === 'togetherai')
		{return 'Get your [API Key here](https://api.together.ai/settings/api-keys). Access 100+ open-source models.';}
	if (providerName === 'fireworksAI')
		{return 'Get your [API Key here](https://fireworks.ai/api-keys). Fast inference for top open-source models.';}
	if (providerName === 'replicate')
		{return 'Get your [API Key here](https://replicate.com/account/api-tokens). Run open-source models in the cloud.';}
	if (providerName === 'perplexity')
		{return 'Get your [API Key here](https://www.perplexity.ai/settings/api). Access online and chat models.';}
	if (providerName === 'cerebras')
		{return 'Get your [API Key here](https://cloud.cerebras.ai/). Ultra-fast inference with Cerebras hardware.';}
	if (providerName === 'cohere')
		{return 'Get your [API Key here](https://dashboard.cohere.com/api-keys). Enterprise-grade language models.';}
	if (providerName === 'deepinfra')
		{return 'Get your [API Key here](https://deepinfra.com/dash/api_keys). Serverless inference for popular models.';}
	if (providerName === 'ai21')
		{return 'Get your [API Key here](https://studio.ai21.com/account/api-key). Access Jamba models.';}
	if (providerName === 'hyperbolic')
		{return 'Get your [API Key here](https://app.hyperbolic.xyz/). Fast, affordable model inference.';}
	if (providerName === 'nebius')
		{return 'Get your [API Key here](https://nebius.ai/). Access powerful open-source models.';}
	// Chinese AI Providers
	if (providerName === 'moonshot')
		{return 'Get your [API Key here](https://platform.moonshot.cn/console/api-keys). Access Kimi models with 128K+ context.';}
	if (providerName === 'zhipu')
		{return 'Get your [API Key here](https://open.bigmodel.cn/). Access ChatGLM and GLM-4 models.';}
	if (providerName === 'baichuan')
		{return 'Get your [API Key here](https://platform.baichuan-ai.com/). Strong in Chinese language tasks.';}
	if (providerName === 'yi')
		{return 'Get your [API Key here](https://platform.01.ai/). Access Yi models from 01.AI.';}
	if (providerName === 'alibabaCloud')
		{return 'Get your [API Key here](https://dashscope.console.aliyun.com/). Access Qwen models via Alibaba Cloud.';}
	if (providerName === 'minimax')
		{return 'Get your [API Key here](https://platform.minimaxi.com/). Also requires Group ID.';}
	if (providerName === 'siliconflow')
		{return 'Get your [API Key here](https://cloud.siliconflow.cn/). Fast inference for open-source models.';}
	if (providerName === 'tencentHunyuan')
		{return 'Get your [API Key here](https://cloud.tencent.com/product/hunyuan). Access Tencent Hunyuan models.';}
	if (providerName === 'bytedanceDoubao')
		{return 'Get your [API Key here](https://console.volcengine.com/). Access Doubao models via Volcano Engine.';}
	if (providerName === 'stepfun')
		{return 'Get your [API Key here](https://platform.stepfun.com/). Advanced reasoning models.';}
	if (providerName === 'sensetimeNova')
		{return 'Get your [API Key here](https://platform.sensenova.cn/). Access SenseChat models.';}
	if (providerName === 'iflytekSpark')
		{return 'Get your [API Key here](https://xinghuo.xfyun.cn/). Access iFlytek Spark models.';}
	// Inference Platforms
	if (providerName === 'sambanova')
		{return 'Get your [API Key here](https://cloud.sambanova.ai/). Ultra-fast inference.';}
	if (providerName === 'leptonai')
		{return 'Get your [API Key here](https://www.lepton.ai/). Developer-friendly AI platform.';}
	if (providerName === 'novitaai')
		{return 'Get your [API Key here](https://novita.ai/). Access LLMs and image models.';}
	if (providerName === 'octoai')
		{return 'Get your [API Key here](https://octoai.cloud/). Optimized model inference.';}
	if (providerName === 'runpod')
		{return 'Get your [API Key here](https://www.runpod.io/). Serverless GPU endpoints.';}
	if (providerName === 'anyscale')
		{return 'Get your [API Key here](https://www.anyscale.com/). Scalable LLM endpoints.';}
	if (providerName === 'baseten')
		{return 'Get your [API Key here](https://www.baseten.co/). Deploy and serve models.';}
	if (providerName === 'lambdalabs')
		{return 'Get your [API Key here](https://lambdalabs.com/). GPU cloud for AI inference.';}
	if (providerName === 'featherless')
		{return 'Get your [API Key here](https://featherless.ai/). Serverless LLM inference.';}
	if (providerName === 'gradientai')
		{return 'Get your [API Key here](https://gradient.ai/). Fine-tune and deploy LLMs.';}
	if (providerName === 'predibase')
		{return 'Get your [API Key here](https://predibase.com/). Deploy and fine-tune LLMs.';}
	if (providerName === 'nvidiaNim')
		{return 'Get your [API Key here](https://build.nvidia.com/). NVIDIA optimized inference.';}
	if (providerName === 'databricks')
		{return 'Configure your [workspace here](https://www.databricks.com/). Access Mosaic AI.';}
	if (providerName === 'modal')
		{return 'Get your [API Key here](https://modal.com/). Serverless GPU computing.';}
	if (providerName === 'mancer')
		{return 'Get your [API Key here](https://mancer.tech/). Uncensored LLM inference.';}
	// Enterprise & Specialty
	if (providerName === 'cloudflareAI')
		{return 'Get your [API Key here](https://dash.cloudflare.com/). Also requires Account ID.';}
	if (providerName === 'rekaai')
		{return 'Get your [API Key here](https://www.reka.ai/). Multimodal AI models.';}
	if (providerName === 'alephalpha')
		{return 'Get your [API Key here](https://aleph-alpha.com/). European AI with data sovereignty.';}
	if (providerName === 'writerai')
		{return 'Get your [API Key here](https://writer.com/). Enterprise AI with Palmyra models.';}
	if (providerName === 'inflectionai')
		{return 'Get your [API Key here](https://inflection.ai/). Human-centered AI models.';}
	if (providerName === 'netmindai')
		{return 'Get your [API Key here](https://netmind.ai/). High-performance inference.';}
	if (providerName === 'inworldai')
		{return 'Get your [API Key here](https://studio.inworld.ai/). AI characters for games.';}
	if (providerName === 'upstage')
		{return 'Get your [API Key here](https://www.upstage.ai/). Access Solar LLM models.';}
	if (providerName === 'textsynth')
		{return 'Get your [API Key here](https://textsynth.com/). Text completion and generation.';}
	if (providerName === 'forefrontai')
		{return 'Get your [API Key here](https://www.forefront.ai/). AI assistant platform.';}
	// Aggregators & Gateways
	if (providerName === 'aimlapi')
		{return 'Get your [API Key here](https://aimlapi.com/). Unified access to 100+ models.';}
	if (providerName === 'poeapi')
		{return 'Get your [API Key here](https://poe.com/). Access 100+ models with one key.';}
	if (providerName === 'edenai')
		{return 'Get your [API Key here](https://www.edenai.co/). Multi-provider AI gateway.';}
	if (providerName === 'unifyai')
		{return 'Get your [API Key here](https://unify.ai/). LLM routing and optimization.';}
	if (providerName === 'portkey')
		{return 'Get your [API Key here](https://portkey.ai/). LLM gateway with 250+ models.';}
	if (providerName === 'martian')
		{return 'Get your [API Key here](https://withmartian.com/). Smart LLM routing.';}
	if (providerName === 'nlpcloud')
		{return 'Get your [API Key here](https://nlpcloud.com/). Production-ready NLP APIs.';}
	// Specialized
	if (providerName === 'voyageai')
		{return 'Get your [API Key here](https://www.voyageai.com/). Best-in-class embeddings.';}
	if (providerName === 'jinaai')
		{return 'Get your [API Key here](https://jina.ai/). Embeddings and search AI.';}
	if (providerName === 'friendliai')
		{return 'Get your [API Key here](https://friendli.ai/). Fast & efficient inference.';}
	if (providerName === 'elevenlabs')
		{return 'Get your [API Key here](https://elevenlabs.io/). Voice AI and text-to-speech.';}

	throw new Error(`subTextMdOfProviderName: Unknown provider name: "${providerName}"`);
};


type DisplayInfo = {
	title: string;
	placeholder: string;
	isPasswordField?: boolean;
};
export const displayInfoOfSettingName = (providerName: ProviderName, settingName: SettingName): DisplayInfo => {
	if (settingName === 'apiKey') {
		return {
			title: 'API Key',

			// **Please follow this convention**:
			// The word "key..." here is a placeholder for the hash. For example, sk-ant-key... means the key will look like sk-ant-abcdefg123...
			placeholder:
				providerName === 'anthropic'
					? 'sk-ant-key...' // sk-ant-api03-key
					: providerName === 'openAI'
						? 'sk-proj-key...'
						: providerName === 'deepseek'
							? 'sk-key...'
							: providerName === 'openRouter'
								? 'sk-or-key...' // sk-or-v1-key
								: providerName === 'gemini'
									? 'AIzaSy...'
									: providerName === 'groq'
										? 'gsk_key...'
										: providerName === 'openAICompatible'
											? 'sk-key...'
											: providerName === 'xAI'
												? 'xai-key...'
												: providerName === 'mistral'
													? 'api-key...'
													: providerName === 'huggingFace'
														? 'hf_key...'
														: providerName === 'googleVertex'
															? 'AIzaSy...'
															: providerName === 'microsoftAzure'
																? 'key-...'
																: providerName === 'awsBedrock'
																	? 'key-...'
																	: providerName === 'togetherai'
																		? 'key-...'
																		: providerName === 'fireworksAI'
																			? 'fw-key...'
																			: providerName === 'replicate'
																				? 'r8_key...'
																				: providerName === 'perplexity'
																					? 'pplx-key...'
																					: providerName === 'cerebras'
																						? 'csk-key...'
																						: providerName === 'cohere'
																							? 'co-key...'
																							: providerName === 'deepinfra'
																								? 'key-...'
																								: providerName === 'ai21'
																									? 'key-...'
																									: providerName === 'hyperbolic'
																										? 'key-...'
																										: providerName === 'nebius'
																											? 'key-...'
																											: '',

			isPasswordField: true,
		};
	} else if (settingName === 'endpoint') {
		return {
			title:
				providerName === 'ollama'
					? 'Endpoint'
					: providerName === 'vLLM'
						? 'Endpoint'
						: providerName === 'lmStudio'
							? 'Endpoint'
							: providerName === 'openAICompatible'
								? 'baseURL' // (do not include /chat/completions)
								: providerName === 'googleVertex'
									? 'baseURL'
									: providerName === 'microsoftAzure'
										? 'baseURL'
										: providerName === 'liteLLM'
											? 'baseURL'
											: providerName === 'awsBedrock'
												? 'Endpoint'
												: '(never)',

			placeholder:
				providerName === 'ollama'
					? defaultProviderSettings.ollama.endpoint
					: providerName === 'vLLM'
						? defaultProviderSettings.vLLM.endpoint
						: providerName === 'openAICompatible'
							? 'https://my-website.com/v1'
							: providerName === 'lmStudio'
								? defaultProviderSettings.lmStudio.endpoint
								: providerName === 'liteLLM'
									? 'http://localhost:4000'
									: providerName === 'awsBedrock'
										? 'http://localhost:4000/v1'
										: '(never)',
		};
	} else if (settingName === 'headersJSON') {
		return { title: 'Custom Headers', placeholder: '{ "X-Request-Id": "..." }' };
	} else if (settingName === 'region') {
		// vertex only
		return {
			title: 'Region',
			placeholder:
				providerName === 'googleVertex'
					? defaultProviderSettings.googleVertex.region
					: providerName === 'awsBedrock'
						? defaultProviderSettings.awsBedrock.region
						: '',
		};
	} else if (settingName === 'azureApiVersion') {
		// azure only
		return {
			title: 'API Version',
			placeholder: providerName === 'microsoftAzure' ? defaultProviderSettings.microsoftAzure.azureApiVersion : '',
		};
	} else if (settingName === 'project') {
		return {
			title: providerName === 'microsoftAzure' ? 'Resource' : providerName === 'googleVertex' ? 'Project' : '',
			placeholder:
				providerName === 'microsoftAzure' ? 'my-resource' : providerName === 'googleVertex' ? 'my-project' : '',
		};
	} else if (settingName === '_didFillInProviderSettings') {
		return {
			title: '(never)',
			placeholder: '(never)',
		};
	} else if (settingName === 'models') {
		return {
			title: '(never)',
			placeholder: '(never)',
		};
	}

	throw new Error(`displayInfo: Unknown setting name: "${settingName}"`);
};

const defaultCustomSettings: Record<CustomSettingName, undefined> = {
	apiKey: undefined,
	endpoint: undefined,
	region: undefined, // googleVertex
	project: undefined,
	azureApiVersion: undefined,
	headersJSON: undefined,
	groupId: undefined, // minimax
	accountId: undefined, // cloudflareAI
};


const modelInfoOfDefaultModelNames = (defaultModelNames: string[]): { models: GridStatefulModelInfo[] } => {
	return {
		models: defaultModelNames.map((modelName, i) => ({
			modelName,
			type: 'default',
			isHidden: defaultModelNames.length >= 10, // hide all models if there are a ton of them, and make user enable them individually
		})),
	};
};

// used when waiting and for a type reference
export const defaultSettingsOfProvider: SettingsOfProvider = {
	anthropic: {
		...defaultCustomSettings,
		...defaultProviderSettings.anthropic,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.anthropic),
		_didFillInProviderSettings: undefined,
	},
	openAI: {
		...defaultCustomSettings,
		...defaultProviderSettings.openAI,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openAI),
		_didFillInProviderSettings: undefined,
	},
	deepseek: {
		...defaultCustomSettings,
		...defaultProviderSettings.deepseek,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.deepseek),
		_didFillInProviderSettings: undefined,
	},
	gemini: {
		...defaultCustomSettings,
		...defaultProviderSettings.gemini,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.gemini),
		_didFillInProviderSettings: undefined,
	},
	xAI: {
		...defaultCustomSettings,
		...defaultProviderSettings.xAI,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.xAI),
		_didFillInProviderSettings: undefined,
	},
	mistral: {
		...defaultCustomSettings,
		...defaultProviderSettings.mistral,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.mistral),
		_didFillInProviderSettings: undefined,
	},
	huggingFace: {
		...defaultCustomSettings,
		...defaultProviderSettings.huggingFace,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.huggingFace),
		_didFillInProviderSettings: undefined,
	},
	liteLLM: {
		...defaultCustomSettings,
		...defaultProviderSettings.liteLLM,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.liteLLM),
		_didFillInProviderSettings: undefined,
	},
	lmStudio: {
		...defaultCustomSettings,
		...defaultProviderSettings.lmStudio,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.lmStudio),
		_didFillInProviderSettings: undefined,
	},
	groq: {
		// aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.groq,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.groq),
		_didFillInProviderSettings: undefined,
	},
	openRouter: {
		// aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.openRouter,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openRouter),
		_didFillInProviderSettings: undefined,
	},
	openAICompatible: {
		// aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.openAICompatible,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.openAICompatible),
		_didFillInProviderSettings: undefined,
	},
	ollama: {
		// aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.ollama,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.ollama),
		_didFillInProviderSettings: undefined,
	},
	vLLM: {
		// aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.vLLM,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.vLLM),
		_didFillInProviderSettings: undefined,
	},
	googleVertex: {
		// aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.googleVertex,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.googleVertex),
		_didFillInProviderSettings: undefined,
	},
	microsoftAzure: {
		// aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.microsoftAzure,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.microsoftAzure),
		_didFillInProviderSettings: undefined,
	},
	awsBedrock: {
		// aggregator (serves models from multiple providers)
		...defaultCustomSettings,
		...defaultProviderSettings.awsBedrock,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.awsBedrock),
		_didFillInProviderSettings: undefined,
	},
	// Existing providers that were missing
	togetherai: {
		...defaultCustomSettings,
		...defaultProviderSettings.togetherai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.togetherai),
		_didFillInProviderSettings: undefined,
	},
	fireworksAI: {
		...defaultCustomSettings,
		...defaultProviderSettings.fireworksAI,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.fireworksAI),
		_didFillInProviderSettings: undefined,
	},
	replicate: {
		...defaultCustomSettings,
		...defaultProviderSettings.replicate,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.replicate),
		_didFillInProviderSettings: undefined,
	},
	perplexity: {
		...defaultCustomSettings,
		...defaultProviderSettings.perplexity,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.perplexity),
		_didFillInProviderSettings: undefined,
	},
	cerebras: {
		...defaultCustomSettings,
		...defaultProviderSettings.cerebras,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.cerebras),
		_didFillInProviderSettings: undefined,
	},
	cohere: {
		...defaultCustomSettings,
		...defaultProviderSettings.cohere,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.cohere),
		_didFillInProviderSettings: undefined,
	},
	deepinfra: {
		...defaultCustomSettings,
		...defaultProviderSettings.deepinfra,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.deepinfra),
		_didFillInProviderSettings: undefined,
	},
	ai21: {
		...defaultCustomSettings,
		...defaultProviderSettings.ai21,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.ai21),
		_didFillInProviderSettings: undefined,
	},
	hyperbolic: {
		...defaultCustomSettings,
		...defaultProviderSettings.hyperbolic,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.hyperbolic),
		_didFillInProviderSettings: undefined,
	},
	nebius: {
		...defaultCustomSettings,
		...defaultProviderSettings.nebius,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.nebius),
		_didFillInProviderSettings: undefined,
	},
	// ============================================
	// CHINESE AI PROVIDERS
	// ============================================
	moonshot: {
		...defaultCustomSettings,
		...defaultProviderSettings.moonshot,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.moonshot),
		_didFillInProviderSettings: undefined,
	},
	zhipu: {
		...defaultCustomSettings,
		...defaultProviderSettings.zhipu,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.zhipu),
		_didFillInProviderSettings: undefined,
	},
	baichuan: {
		...defaultCustomSettings,
		...defaultProviderSettings.baichuan,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.baichuan),
		_didFillInProviderSettings: undefined,
	},
	yi: {
		...defaultCustomSettings,
		...defaultProviderSettings.yi,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.yi),
		_didFillInProviderSettings: undefined,
	},
	alibabaCloud: {
		...defaultCustomSettings,
		...defaultProviderSettings.alibabaCloud,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.alibabaCloud),
		_didFillInProviderSettings: undefined,
	},
	minimax: {
		...defaultCustomSettings,
		...defaultProviderSettings.minimax,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.minimax),
		_didFillInProviderSettings: undefined,
	},
	siliconflow: {
		...defaultCustomSettings,
		...defaultProviderSettings.siliconflow,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.siliconflow),
		_didFillInProviderSettings: undefined,
	},
	tencentHunyuan: {
		...defaultCustomSettings,
		...defaultProviderSettings.tencentHunyuan,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.tencentHunyuan),
		_didFillInProviderSettings: undefined,
	},
	bytedanceDoubao: {
		...defaultCustomSettings,
		...defaultProviderSettings.bytedanceDoubao,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.bytedanceDoubao),
		_didFillInProviderSettings: undefined,
	},
	stepfun: {
		...defaultCustomSettings,
		...defaultProviderSettings.stepfun,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.stepfun),
		_didFillInProviderSettings: undefined,
	},
	sensetimeNova: {
		...defaultCustomSettings,
		...defaultProviderSettings.sensetimeNova,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.sensetimeNova),
		_didFillInProviderSettings: undefined,
	},
	iflytekSpark: {
		...defaultCustomSettings,
		...defaultProviderSettings.iflytekSpark,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.iflytekSpark),
		_didFillInProviderSettings: undefined,
	},
	// ============================================
	// INFERENCE PLATFORMS
	// ============================================
	sambanova: {
		...defaultCustomSettings,
		...defaultProviderSettings.sambanova,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.sambanova),
		_didFillInProviderSettings: undefined,
	},
	leptonai: {
		...defaultCustomSettings,
		...defaultProviderSettings.leptonai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.leptonai),
		_didFillInProviderSettings: undefined,
	},
	novitaai: {
		...defaultCustomSettings,
		...defaultProviderSettings.novitaai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.novitaai),
		_didFillInProviderSettings: undefined,
	},
	octoai: {
		...defaultCustomSettings,
		...defaultProviderSettings.octoai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.octoai),
		_didFillInProviderSettings: undefined,
	},
	runpod: {
		...defaultCustomSettings,
		...defaultProviderSettings.runpod,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.runpod),
		_didFillInProviderSettings: undefined,
	},
	anyscale: {
		...defaultCustomSettings,
		...defaultProviderSettings.anyscale,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.anyscale),
		_didFillInProviderSettings: undefined,
	},
	baseten: {
		...defaultCustomSettings,
		...defaultProviderSettings.baseten,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.baseten),
		_didFillInProviderSettings: undefined,
	},
	lambdalabs: {
		...defaultCustomSettings,
		...defaultProviderSettings.lambdalabs,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.lambdalabs),
		_didFillInProviderSettings: undefined,
	},
	featherless: {
		...defaultCustomSettings,
		...defaultProviderSettings.featherless,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.featherless),
		_didFillInProviderSettings: undefined,
	},
	gradientai: {
		...defaultCustomSettings,
		...defaultProviderSettings.gradientai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.gradientai),
		_didFillInProviderSettings: undefined,
	},
	predibase: {
		...defaultCustomSettings,
		...defaultProviderSettings.predibase,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.predibase),
		_didFillInProviderSettings: undefined,
	},
	nvidiaNim: {
		...defaultCustomSettings,
		...defaultProviderSettings.nvidiaNim,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.nvidiaNim),
		_didFillInProviderSettings: undefined,
	},
	databricks: {
		...defaultCustomSettings,
		...defaultProviderSettings.databricks,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.databricks),
		_didFillInProviderSettings: undefined,
	},
	modal: {
		...defaultCustomSettings,
		...defaultProviderSettings.modal,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.modal),
		_didFillInProviderSettings: undefined,
	},
	mancer: {
		...defaultCustomSettings,
		...defaultProviderSettings.mancer,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.mancer),
		_didFillInProviderSettings: undefined,
	},
	// ============================================
	// ENTERPRISE & SPECIALTY PROVIDERS
	// ============================================
	cloudflareAI: {
		...defaultCustomSettings,
		...defaultProviderSettings.cloudflareAI,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.cloudflareAI),
		_didFillInProviderSettings: undefined,
	},
	rekaai: {
		...defaultCustomSettings,
		...defaultProviderSettings.rekaai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.rekaai),
		_didFillInProviderSettings: undefined,
	},
	alephalpha: {
		...defaultCustomSettings,
		...defaultProviderSettings.alephalpha,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.alephalpha),
		_didFillInProviderSettings: undefined,
	},
	writerai: {
		...defaultCustomSettings,
		...defaultProviderSettings.writerai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.writerai),
		_didFillInProviderSettings: undefined,
	},
	inflectionai: {
		...defaultCustomSettings,
		...defaultProviderSettings.inflectionai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.inflectionai),
		_didFillInProviderSettings: undefined,
	},
	netmindai: {
		...defaultCustomSettings,
		...defaultProviderSettings.netmindai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.netmindai),
		_didFillInProviderSettings: undefined,
	},
	inworldai: {
		...defaultCustomSettings,
		...defaultProviderSettings.inworldai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.inworldai),
		_didFillInProviderSettings: undefined,
	},
	upstage: {
		...defaultCustomSettings,
		...defaultProviderSettings.upstage,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.upstage),
		_didFillInProviderSettings: undefined,
	},
	textsynth: {
		...defaultCustomSettings,
		...defaultProviderSettings.textsynth,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.textsynth),
		_didFillInProviderSettings: undefined,
	},
	forefrontai: {
		...defaultCustomSettings,
		...defaultProviderSettings.forefrontai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.forefrontai),
		_didFillInProviderSettings: undefined,
	},
	// ============================================
	// AGGREGATORS & GATEWAYS
	// ============================================
	aimlapi: {
		...defaultCustomSettings,
		...defaultProviderSettings.aimlapi,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.aimlapi),
		_didFillInProviderSettings: undefined,
	},
	poeapi: {
		...defaultCustomSettings,
		...defaultProviderSettings.poeapi,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.poeapi),
		_didFillInProviderSettings: undefined,
	},
	edenai: {
		...defaultCustomSettings,
		...defaultProviderSettings.edenai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.edenai),
		_didFillInProviderSettings: undefined,
	},
	unifyai: {
		...defaultCustomSettings,
		...defaultProviderSettings.unifyai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.unifyai),
		_didFillInProviderSettings: undefined,
	},
	portkey: {
		...defaultCustomSettings,
		...defaultProviderSettings.portkey,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.portkey),
		_didFillInProviderSettings: undefined,
	},
	martian: {
		...defaultCustomSettings,
		...defaultProviderSettings.martian,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.martian),
		_didFillInProviderSettings: undefined,
	},
	nlpcloud: {
		...defaultCustomSettings,
		...defaultProviderSettings.nlpcloud,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.nlpcloud),
		_didFillInProviderSettings: undefined,
	},
	// ============================================
	// SPECIALIZED (EMBEDDINGS/SEARCH/AUDIO)
	// ============================================
	voyageai: {
		...defaultCustomSettings,
		...defaultProviderSettings.voyageai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.voyageai),
		_didFillInProviderSettings: undefined,
	},
	jinaai: {
		...defaultCustomSettings,
		...defaultProviderSettings.jinaai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.jinaai),
		_didFillInProviderSettings: undefined,
	},
	friendliai: {
		...defaultCustomSettings,
		...defaultProviderSettings.friendliai,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.friendliai),
		_didFillInProviderSettings: undefined,
	},
	elevenlabs: {
		...defaultCustomSettings,
		...defaultProviderSettings.elevenlabs,
		...modelInfoOfDefaultModelNames(defaultModelsOfProvider.elevenlabs),
		_didFillInProviderSettings: undefined,
	},
};


export type ModelSelection =
	| { providerName: ProviderName; modelName: string }
	| { providerName: 'auto'; modelName: 'auto' }; // Special "Auto" selection for automatic routing

export const modelSelectionsEqual = (m1: ModelSelection, m2: ModelSelection) => {
	return m1.modelName === m2.modelName && m1.providerName === m2.providerName;
};

export const isAutoModelSelection = (selection: ModelSelection | null): boolean => {
	return selection?.providerName === 'auto' && selection?.modelName === 'auto';
};

/**
 * Type guard to check if a ModelSelection has a valid ProviderName (not "auto")
 */
export const isValidProviderModelSelection = (
	selection: ModelSelection
): selection is { providerName: ProviderName; modelName: string } => {
	return selection.providerName !== 'auto' && selection.modelName !== 'auto';
};

// this is a state
export const featureNames = ['Chat', 'Ctrl+K', 'Autocomplete', 'Apply', 'SCM'] as const;
export type ModelSelectionOfFeature = Record<(typeof featureNames)[number], ModelSelection | null>;
export type FeatureName = keyof ModelSelectionOfFeature;

export const displayInfoOfFeatureName = (featureName: FeatureName) => {
	// editor:
	if (featureName === 'Autocomplete') {return 'Autocomplete';}
	else if (featureName === 'Ctrl+K') {return 'Quick Edit';}
	// sidebar:
	else if (featureName === 'Chat') {return 'Chat';}
	else if (featureName === 'Apply') {return 'Apply';}
	// source control:
	else if (featureName === 'SCM') {return 'Commit Message Generator';}
	else {throw new Error(`Feature Name ${featureName} not allowed`);}
};

// the models of these can be refreshed (in theory all can, but not all should)
export const refreshableProviderNames = localProviderNames;
export type RefreshableProviderName = (typeof refreshableProviderNames)[number];

// models that come with download buttons
export const hasDownloadButtonsOnModelsProviderNames = ['ollama'] as const satisfies ProviderName[];

// use this in isFeatuerNameDissbled
export const isProviderNameDisabled = (providerName: ProviderName, settingsState: GridSettingsState) => {
	const settingsAtProvider = settingsState.settingsOfProvider[providerName];
	const isAutodetected = (refreshableProviderNames as string[]).includes(providerName);

	const isDisabled = settingsAtProvider.models.length === 0;
	if (isDisabled) {
		return isAutodetected
			? 'providerNotAutoDetected'
			: !settingsAtProvider._didFillInProviderSettings
				? 'notFilledIn'
				: 'addModel';
	}
	return false;
};

export const isFeatureNameDisabled = (featureName: FeatureName, settingsState: GridSettingsState) => {
	// if has a selected provider, check if it's enabled
	const selectedProvider = settingsState.modelSelectionOfFeature[featureName];

	if (selectedProvider) {
		// "Auto" option is always enabled (it will route to available models)
		if (selectedProvider.providerName === 'auto' && selectedProvider.modelName === 'auto') {
			return false;
		}
		const { providerName } = selectedProvider;
		return isProviderNameDisabled(providerName, settingsState);
	}

	// if there are any models they can turn on, tell them that
	const canTurnOnAModel = !!providerNames.find(
		(providerName) => settingsState.settingsOfProvider[providerName].models.filter((m) => m.isHidden).length !== 0
	);
	if (canTurnOnAModel) {return 'needToEnableModel';}

	// if there are any providers filled in, then they just need to add a model
	const anyFilledIn = !!providerNames.find(
		(providerName) => settingsState.settingsOfProvider[providerName]._didFillInProviderSettings
	);
	if (anyFilledIn) {return 'addModel';}

	return 'addProvider';
};

export type ChatMode = 'agent' | 'gather' | 'normal';

export type GlobalSettings = {
	autoRefreshModels: boolean;
	aiInstructions: string;
	enableAutocomplete: boolean;
	syncApplyToChat: boolean;
	syncSCMToChat: boolean;
	enableFastApply: boolean;
	chatMode: ChatMode;
	autoApprove: { [approvalType in ToolApprovalType]?: boolean };
	showInlineSuggestions: boolean;
	includeToolLintErrors: boolean;
	isOnboardingComplete: boolean;
	disableSystemMessage: boolean;
	autoAcceptLLMChanges: boolean;
	enableAutoTuneOnPull: boolean;
	enableRepoIndexer?: boolean;
	useHeadlessBrowsing?: boolean;
	// Voice input settings
	enableVoiceInput?: boolean; // Enable voice input in chat (default: true)
	voiceInputLanguage?: string; // Voice recognition language (default: 'en-US')
	// Image QA Pipeline settings
	imageQAAllowRemoteModels: boolean;
	imageQAEnableHybridMode: boolean;
	imageQADevMode: boolean;
	enableMemories?: boolean; // Enable persistent project memories (default: true)
	enableYOLOMode?: boolean; // Enable YOLO mode: auto-apply low-risk edits (default: false)
	yoloRiskThreshold?: number; // Maximum risk score for auto-apply (default: 0.2)
	yoloConfidenceThreshold?: number; // Minimum confidence score for auto-apply (default: 0.7)
	enableInlineCodeReview?: boolean; // Enable inline code review annotations (default: true)
	reviewSeverityFilter?: 'all' | 'warning+error'; // Filter annotations by severity (default: 'all')
	// Audit log settings
	audit?: {
		enable?: boolean; // Enable audit logging (default: false)
		path?: string; // Custom path for audit log (default: ${workspaceRoot}/.grid/audit.jsonl)
		rotationSizeMB?: number; // Rotate log file at this size (default: 10)
	};
	// Indexer settings
	index?: {
		ast?: boolean; // Use tree-sitter AST parsing (default: true)
	};
	// RAG settings
	rag?: {
		vectorStore?: 'none' | 'qdrant' | 'chroma'; // Vector store provider (default: 'none')
		vectorStoreUrl?: string; // Vector store URL (default: http://localhost:6333 for Qdrant, http://localhost:8000 for Chroma)
	};
	// Performance settings
	perf?: {
		enable?: boolean; // Enable performance instrumentation (default: false)
		renderBatchMs?: number; // Token batch interval in ms (default: 50)
		virtualizeChat?: boolean; // Enable chat virtualization (default: false)
		autoCompleteDebounceMs?: number; // Autocomplete debounce delay in ms (default: 35)
		indexerCpuBudget?: number; // Indexer CPU budget (0-1, default: 0.2 = 20% of core)
		indexerParallelism?: number; // Indexer parallelism limit (default: 2)
		routerCacheTtlMs?: number; // Router cache TTL in ms (default: 2000)
	};
	// Local-First AI: When enabled, heavily bias router toward local models
	localFirstAI?: boolean; // Prefer local models over cloud models (default: false)
	// FIM (Fill-In-the-Middle) customization for quick edit (Ctrl+K)
	fim?: {
		preTag?: string; // FIM prefix tag (default: '<PRE>')
		sufTag?: string; // FIM suffix tag (default: '<SUF>')
		midTag?: string; // FIM middle tag (default: '<MID>')
	};
	// Autocomplete feature flags
	autocomplete?: {
		enableContextRanking?: boolean; // Enable multi-signal context ranking (default: true)
		enableBracketMatching?: boolean; // Enable bracket matching filter (default: true)
		enableImportDefinitions?: boolean; // Enable import/definition tracking (default: true)
		enableGeneratorReuse?: boolean; // Enable LLM generator reuse optimization (default: true)
		enableLogging?: boolean; // Enable autocomplete telemetry logging (default: true)
		enableStaticContext?: boolean; // Enable static context extraction (default: true)
		enableTokenBatching?: boolean; // Enable token batching for analytics (default: true)
		enableDebouncer?: boolean; // Enable smart debouncing (default: true)
	};
};

export const defaultGlobalSettings: GlobalSettings = {
	autoRefreshModels: true,
	aiInstructions: '',
	enableAutocomplete: false,
	syncApplyToChat: true,
	syncSCMToChat: true,
	enableFastApply: true,
	chatMode: 'agent',
	autoApprove: {},
	showInlineSuggestions: true,
	includeToolLintErrors: true,
	isOnboardingComplete: false,
	disableSystemMessage: false,
	autoAcceptLLMChanges: false,
	enableAutoTuneOnPull: true,
	enableRepoIndexer: true,
	useHeadlessBrowsing: true, // Use headless BrowserWindow for better content extraction (default)
	// Voice input defaults
	enableVoiceInput: true, // Enable voice input by default
	voiceInputLanguage: 'en-US', // Default to US English
	// Image QA Pipeline defaults
	imageQAAllowRemoteModels: false, // Local-first by default
	imageQAEnableHybridMode: true,
	imageQADevMode: false,
	enableMemories: true, // Enable memories by default
	enableYOLOMode: false, // YOLO mode disabled by default (requires explicit opt-in)
	yoloRiskThreshold: 0.2, // Auto-apply edits with risk < 0.2
	yoloConfidenceThreshold: 0.7, // Auto-apply edits with confidence > 0.7
	enableInlineCodeReview: true, // Enable inline code review annotations by default
	reviewSeverityFilter: 'all', // Show all annotations by default
	// Audit log defaults
	audit: {
		enable: false, // Audit logging disabled by default
		path: undefined, // Will use ${workspaceRoot}/.grid/audit.jsonl
		rotationSizeMB: 10,
	},
	// Indexer defaults
	index: {
		ast: true, // AST parsing enabled by default
	},
	// RAG defaults
	rag: {
		vectorStore: 'none', // No vector store by default
		vectorStoreUrl: undefined, // Will use default URLs per provider
	},
	// Performance defaults (all optimizations enabled by default)
	perf: {
		enable: true, // Performance instrumentation enabled by default
		renderBatchMs: 50, // 50ms token batching
		virtualizeChat: false, // Chat virtualization disabled by default (requires react-window)
		autoCompleteDebounceMs: 35, // 35ms autocomplete debounce (optimized from 500ms)
		indexerCpuBudget: 0.2, // 20% of a core (CPU throttling enabled)
		indexerParallelism: 2, // 2 parallel workers (parallelism limit enabled)
		routerCacheTtlMs: 2000, // 2 second cache TTL (caching enabled)
	},
	localFirstAI: false, // Local-First AI disabled by default (users can enable for privacy/performance)
	// FIM defaults (Fill-In-the-Middle tags for quick edit)
	fim: {
		preTag: 'ABOVE', // Default prefix tag
		sufTag: 'BELOW', // Default suffix tag
		midTag: 'SELECTION', // Default middle tag
	},
	// Autocomplete feature defaults (all features enabled by default)
	autocomplete: {
		enableContextRanking: true, // Multi-signal context ranking
		enableBracketMatching: true, // Bracket matching filter
		enableImportDefinitions: true, // Import/definition tracking
		enableGeneratorReuse: true, // LLM generator reuse
		enableLogging: true, // Telemetry logging
		enableStaticContext: true, // Static context extraction
		enableTokenBatching: true, // Token batching
		enableDebouncer: true, // Smart debouncing
	},
};

export type GlobalSettingName = keyof GlobalSettings;
export const globalSettingNames = Object.keys(defaultGlobalSettings) as GlobalSettingName[];

export type ModelSelectionOptions = {
	reasoningEnabled?: boolean;
	reasoningBudget?: number;
	reasoningEffort?: string;
};

export type OptionsOfModelSelection = {
	[featureName in FeatureName]: Partial<{
		[providerName in ProviderName]: {
			[modelName: string]: ModelSelectionOptions | undefined;
		};
	}>;
};

export type OverridesOfModel = {
	[providerName in ProviderName]: {
		[modelName: string]: Partial<ModelOverrides> | undefined;
	};
};

const overridesOfModel = {} as OverridesOfModel;
for (const providerName of providerNames) {
	overridesOfModel[providerName] = {};
}
export const defaultOverridesOfModel = overridesOfModel;

export interface MCPUserStateOfName {
	[serverName: string]: MCPUserState | undefined;
}

export interface MCPUserState {
	isOn: boolean;
}

/**
 * User tier for dashboard integration (imported from dashboardTypes)
 */
export type UserTier = 'community' | 'pro' | 'enterprise';

/**
 * Configuration source for dashboard integration
 */
export type ConfigSource = 'local' | 'dashboard' | 'merged';

/**
 * Dashboard settings for automated configuration management
 */
export interface DashboardSettings {
	/** User's current tier */
	tier: UserTier;

	/** API key for dashboard authentication (encrypted in storage) */
	dashboardApiKey?: string;

	/** Dashboard endpoint URL */
	dashboardEndpoint: string;

	/** Whether to automatically sync configuration from dashboard */
	autoSyncConfig: boolean;

	/** Current configuration source */
	configSource: ConfigSource;

	/** Last successful sync timestamp */
	lastSyncTimestamp?: number;

	/** User email (fetched from dashboard) */
	userEmail?: string;

	/** Team ID for enterprise users */
	teamId?: string;

	/** Whether user is team admin */
	isTeamAdmin?: boolean;
}

export const defaultDashboardSettings: DashboardSettings = {
	tier: 'community',
	dashboardApiKey: undefined,
	dashboardEndpoint: 'https://grideditor.com',
	autoSyncConfig: true,
	configSource: 'local',
	lastSyncTimestamp: undefined,
	userEmail: undefined,
	teamId: undefined,
	isTeamAdmin: false,
};
