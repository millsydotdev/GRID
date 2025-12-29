/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAction } from '../../../../../base/common/actions.js';
import { Event } from '../../../../../base/common/event.js';
import { localize } from '../../../../../nls.js';
import * as dom from '../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IActionWidgetDropdownAction, IActionWidgetDropdownActionProvider, IActionWidgetDropdownOptions } from '../../../../../platform/actionWidget/browser/actionWidgetDropdown.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IChatAgentData, IChatAgentService } from '../../common/chatAgents.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';

export interface IAgentPickerDelegate {
    readonly onDidChangeAgent: Event<IChatAgentData | undefined>;
    getCurrentAgent(): IChatAgentData | undefined;
    setAgent(agent: IChatAgentData): void;
    getAgents(): IChatAgentData[];
}

function agentDelegateToWidgetActionsProvider(delegate: IAgentPickerDelegate): IActionWidgetDropdownActionProvider {
    return {
        getActions: () => {
            return delegate.getAgents().map(agent => {
                return {
                    id: agent.id,
                    enabled: true,
                    icon: agent.metadata.icon,
                    checked: agent.id === delegate.getCurrentAgent()?.id,
                    label: agent.fullName || agent.name,
                    description: agent.description,
                    tooltip: agent.description ?? agent.fullName ?? agent.name,
                    run: () => {
                        delegate.setAgent(agent);
                    }
                } satisfies IActionWidgetDropdownAction;
            });
        }
    };
}

/**
 * Action view item for selecting a chat agent in the chat interface.
 */
export class AgentPickerActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(
        action: IAction,
        protected currentAgent: IChatAgentData | undefined,
        widgetOptions: Omit<IActionWidgetDropdownOptions, 'label' | 'labelRenderer'> | undefined,
        delegate: IAgentPickerDelegate,
        @IActionWidgetService actionWidgetService: IActionWidgetService,
        @IContextKeyService contextKeyService: IContextKeyService,
        @IKeybindingService keybindingService: IKeybindingService,
    ) {
        // Modify the original action with a different label and make it show the current agent
        const actionWithLabel: IAction = {
            ...action,
            label: currentAgent?.fullName ?? currentAgent?.name ?? localize('chat.agentPicker.label', "Pick Agent"),
            tooltip: localize('chat.agentPicker.tooltip', "Pick Agent"),
            run: () => { }
        };

        const agentPickerActionWidgetOptions: Omit<IActionWidgetDropdownOptions, 'label' | 'labelRenderer'> = {
            actionProvider: agentDelegateToWidgetActionsProvider(delegate),
            ...widgetOptions
        };

        super(actionWithLabel, agentPickerActionWidgetOptions, actionWidgetService, keybindingService, contextKeyService);

        // Listen for agent changes from the delegate
        this._register(delegate.onDidChangeAgent(agent => {
            this.currentAgent = agent;
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
    }

    protected override renderLabel(element: HTMLElement): IDisposable | null {
        const domChildren = [];
        if (this.currentAgent?.metadata.icon) {
            // If it's a ThemeIcon, we use specific rendering, otherwise we might need image rendering
            if (ThemeIcon.isThemeIcon(this.currentAgent.metadata.icon)) {
                domChildren.push(...renderLabelWithIcons(`\$(${this.currentAgent.metadata.icon.id})`));
            } else {
                // URI icon handling could go here, but for now assuming ThemeIcons widely used
                // Or generic fallback
                domChildren.push(...renderLabelWithIcons(`$(hubot)`));
            }
        } else {
            domChildren.push(...renderLabelWithIcons(`$(hubot)`));
        }

        domChildren.push(dom.$('span.chat-agent-label', undefined, this.currentAgent?.fullName ?? this.currentAgent?.name ?? localize('chat.agentPicker.label', "Pick Agent")));
        domChildren.push(...renderLabelWithIcons(`$(chevron-down)`));

        dom.reset(element, ...domChildren);
        this.setAriaLabelAttributes(element);
        return null;
    }

    override render(container: HTMLElement): void {
        super.render(container);
        container.classList.add('chat-agentPicker-item');
    }
}
