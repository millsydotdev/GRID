/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IChatWidget, IChatWidgetService } from '../chat.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { basename } from '../../../../../base/common/resources.js';
import { IChatRequestVariableEntry } from '../../common/chatVariableEntries.js';
import { ChatAgentLocation } from '../../common/chatAgents.js';

export class GridRulesContribution extends Disposable implements IWorkbenchContribution {
    static readonly ID = 'chat.gridRules';

    constructor(
        @IChatWidgetService private readonly chatWidgetService: IChatWidgetService,
        @IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
        @IFileService private readonly fileService: IFileService
    ) {
        super();
        this._register(this.chatWidgetService.onDidAddWidget(widget => this.handleWidget(widget)));
        this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Chat).forEach(widget => this.handleWidget(widget));
    }

    private async handleWidget(widget: IChatWidget): Promise<void> {
        const rulesFile = await this.findRulesFile();
        if (rulesFile) {
            // Check if already attached
            const isAttached = widget.input.attachmentModel.attachments.some(a =>
                a.kind === 'file' && (a.value as any).toString() === rulesFile.toString()
            );

            if (!isAttached) {
                const entry: IChatRequestVariableEntry = {
                    id: 'vscode.file', // Standard file entry id
                    kind: 'file',
                    name: basename(rulesFile),
                    value: rulesFile,
                    modelDescription: 'System Rules (.gridrules)'
                };
                widget.input.attachmentModel.addContext(entry);
            }
        }
    }

    private async findRulesFile() {
        // Prioritize .gridrules, then grid.md
        const folders = this.workspaceContextService.getWorkspace().folders;
        if (folders.length === 0) {
            return undefined;
        }

        const root = folders[0].uri;

        const gridRules = root.with({ path: root.path + '/.gridrules' });
        if (await this.fileService.exists(gridRules)) {
            return gridRules;
        }

        const gridMd = root.with({ path: root.path + '/grid.md' });
        if (await this.fileService.exists(gridMd)) {
            return gridMd;
        }

        return undefined;
    }
}
