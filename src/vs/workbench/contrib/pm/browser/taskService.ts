/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITaskService, IProject, ITask } from '../common/taskService.js';
import { Emitter } from '../../../../base/common/event.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../platform/log/common/log.js';

export class TaskService extends Disposable implements ITaskService {
    declare readonly _serviceBrand: undefined;

    private readonly _onDidChangeProjects = this._register(new Emitter<IProject[]>());
    readonly onDidChangeProjects = this._onDidChangeProjects.event;

    private _projects: IProject[] = [];
    private _baseUrl = 'http://localhost:3000/api/ide/pm'; // Should be configurable
    // In real implementation, fetching API key from SecretStorage or Configuration
    private _apiKey = 'grid_dev_key';

    constructor(
        @IConfigurationService private readonly configurationService: IConfigurationService,
        @ILogService private readonly logService: ILogService
    ) {
        super();
        this._baseUrl = this.configurationService.getValue<string>('grid.websiteUrl') || 'http://localhost:3000';
        // Polling for demo purposes
        setInterval(() => this.sync(), 30000);
        this.sync();
    }

    async getProjects(): Promise<IProject[]> {
        if (this._projects.length === 0) {
            await this.sync();
        }
        return this._projects;
    }

    async sync(): Promise<void> {
        try {
            const response = await fetch(`${this._baseUrl}/api/ide/pm/projects`, {
                headers: {
                    'Authorization': `Bearer ${this._apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to sync projects: ${response.statusText}`);
            }

            const data = await response.json();
            // Map raw data to IProject interface if needed, or assume match
            this._projects = data.map((p: unknown) => ({
                id: p.id,
                name: p.name,
                tasks: p.tasks?.map((t: unknown) => ({
                    id: t.id,
                    projectId: t.project_id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    context: t.context
                })) || []
            }));

            this._onDidChangeProjects.fire(this._projects);
        } catch (error) {
            this.logService.error('TaskService Sync Error:', error);
        }
    }

    async createTask(projectId: string, title: string, context?: unknown): Promise<ITask> {
        try {
            const response = await fetch(`${this._baseUrl}/api/ide/pm/tasks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this._apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    project_id: projectId,
                    title,
                    context
                })
            });

            if (!response.ok) {throw new Error('Failed to create task');}

            const newTaskRaw = await response.json();
            const newTask: ITask = {
                id: newTaskRaw.id,
                projectId: newTaskRaw.project_id,
                title: newTaskRaw.title,
                status: newTaskRaw.status,
                priority: newTaskRaw.priority,
                context: newTaskRaw.context
            };

            // Optimist update
            const project = this._projects.find(p => p.id === projectId);
            if (project) {
                project.tasks.unshift(newTask);
                this._onDidChangeProjects.fire(this._projects);
            } else {
                await this.sync();
            }

            return newTask;
        } catch (error) {
            this.logService.error('TaskService Create Error:', error);
            throw error;
        }
    }

    async updateTask(taskId: string, updates: Partial<ITask>): Promise<ITask> {
        try {
            const response = await fetch(`${this._baseUrl}/api/ide/pm/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this._apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {throw new Error('Failed to update task');}

            const updatedRaw = await response.json();
            const updatedTask: ITask = {
                id: updatedRaw.id,
                projectId: updatedRaw.project_id,
                title: updatedRaw.title,
                status: updatedRaw.status,
                priority: updatedRaw.priority,
                context: updatedRaw.context
            };

            // Update local state
            for (const project of this._projects) {
                const idx = project.tasks.findIndex(t => t.id === taskId);
                if (idx !== -1) {
                    project.tasks[idx] = updatedTask;
                    this._onDidChangeProjects.fire(this._projects);
                    break;
                }
            }

            return updatedTask;

        } catch (error) {
            this.logService.error('TaskService Update Error:', error);
            throw error;
        }
    }
}
