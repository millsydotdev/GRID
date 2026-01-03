/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';

export const ITaskService = createDecorator<ITaskService>('taskService');

export interface ITask {
    id: string;
    projectId: string;
    title: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    context?: unknown;
}

export interface IProject {
    id: string;
    name: string;
    tasks: ITask[];
}

export interface ITaskService {
    readonly _serviceBrand: undefined;

    readonly onDidChangeProjects: Event<IProject[]>;

    getProjects(): Promise<IProject[]>;
    createTask(projectId: string, title: string, context?: unknown): Promise<ITask>;
    updateTask(taskId: string, updates: Partial<ITask>): Promise<ITask>;
    sync(): Promise<void>;
}
