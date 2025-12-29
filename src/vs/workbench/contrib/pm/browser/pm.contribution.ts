import { Registry } from '../../../../platform/registry/common/platform.js';
import { IViewContainersRegistry, ViewContainerLocation, Extensions as ViewContainerExtensions, IViewsRegistry } from '../../../common/views.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { TasksView } from './tasksView.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { ITaskService } from '../common/taskService.js';
import { TaskService } from './taskService.js';

// Register Service
registerSingleton(ITaskService, TaskService, InstantiationType.Delayed);

// View Container & View
const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
    id: 'workbench.view.pm',
    title: { value: 'Project Management', original: 'Project Management' },
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, ['workbench.view.pm', { mergeViewWithContainerWhenSingleView: true }]),
    storageId: 'workbench.view.pm',
    icon: { id: 'codicon/list-selection' }, // Standard codicon
    order: 4
}, ViewContainerLocation.Sidebar);

const viewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);
viewsRegistry.registerViews([{
    id: 'workbench.view.pm.tasks',
    name: { value: 'Tasks', original: 'Tasks' },
    containerIcon: { id: 'codicon/list-selection' },
    ctorDescriptor: new SyncDescriptor(TasksView),
    canToggleVisibility: true,
    workspace: true,
    canMoveView: true
}], VIEW_CONTAINER);

import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';

CommandsRegistry.registerCommand('grid.pm.createTaskFromSelection', async (accessor: ServicesAccessor) => {
    const editorService = accessor.get(IEditorService);
    const taskService = accessor.get(ITaskService);

    const activeEditor = editorService.activeTextEditorControl;
    const activeModel = activeEditor?.getModel();

    if (!activeEditor || !activeModel || !('uri' in activeModel)) return;

    const selection = activeEditor.getSelection();
    const selectedText = selection ? activeModel.getValueInRange(selection) : '';
    const filePath = activeModel.uri.fsPath;
    const line = selection?.startLineNumber;

    // TODO: Show QuickInput to get Project and Title, then create
    // For now, auto-create in first project as 'New Task from Code'
    const projects = await taskService.getProjects();
    if (projects.length > 0) {
        await taskService.createTask(projects[0].id, selectedText || 'New Task from Code', {
            file: filePath,
            line: line,
            snippet: selectedText.substring(0, 100)
        });
    }
});

