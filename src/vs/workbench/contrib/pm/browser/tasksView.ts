import { ITaskService } from '../common/taskService.js';
import { ViewPane, IViewPaneOptions } from '../../../browser/parts/views/viewPane.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { $ } from '../../../../base/browser/dom.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';

export class TasksView extends ViewPane {

    constructor(
        options: IViewPaneOptions,
        @IKeybindingService keybindingService: IKeybindingService,
        @IContextMenuService contextMenuService: IContextMenuService,
        @IConfigurationService configurationService: IConfigurationService,
        @IContextKeyService contextKeyService: IContextKeyService,
        @IViewDescriptorService viewDescriptorService: IViewDescriptorService,
        @IInstantiationService instantiationService: IInstantiationService,
        @IOpenerService openerService: IOpenerService,
        @IThemeService themeService: IThemeService,
        @IHoverService hoverService: IHoverService,
        @ITaskService private readonly taskService: ITaskService
    ) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
    }

    protected renderBody(container: HTMLElement): void {
        super.renderBody(container);

        const listContainer = $('.tasks-list-container');
        listContainer.style.padding = '10px';
        container.appendChild(listContainer);

        const refreshButton = document.createElement('button');
        refreshButton.textContent = 'Refresh Tasks';
        refreshButton.className = 'monaco-button';
        refreshButton.style.marginBottom = '10px';
        refreshButton.onclick = () => this.refresh(listContainer);
        listContainer.appendChild(refreshButton);

        this._register(this.taskService.onDidChangeProjects(() => this.refresh(listContainer)));
        this.refresh(listContainer);
    }

    private async refresh(container: HTMLElement): Promise<void> {
        // Clear all except the first child (refresh button)
        while (container.childNodes.length > 1) {
            container.removeChild(container.lastChild!);
        }

        const projects = await this.taskService.getProjects();

        if (projects.length === 0) {
            const empty = $('span');
            empty.textContent = 'No projects found.';
            empty.style.opacity = '0.6';
            container.appendChild(empty);
            return;
        }

        for (const project of projects) {
            const projectHeader = document.createElement('h3');
            projectHeader.textContent = project.name;
            projectHeader.style.marginBottom = '5px';
            projectHeader.style.color = 'var(--vscode-sideBarTitle-foreground)';
            container.appendChild(projectHeader);

            for (const task of project.tasks) {
                const taskRow = $('.task-row');
                taskRow.style.display = 'flex';
                taskRow.style.alignItems = 'center';
                taskRow.style.marginBottom = '4px';

                const checkbox = $('input', { type: 'checkbox' }) as HTMLInputElement;
                checkbox.checked = task.status === 'done';
                checkbox.onchange = () => {
                    this.taskService.updateTask(task.id, { status: checkbox.checked ? 'done' : 'todo' });
                };

                const label = $('span');
                label.textContent = task.title;
                label.style.marginLeft = '8px';
                if (task.status === 'done') {
                    label.style.textDecoration = 'line-through';
                    label.style.opacity = '0.7';
                }

                taskRow.appendChild(checkbox);
                taskRow.appendChild(label);
                container.appendChild(taskRow);
            }
        }
    }
}
