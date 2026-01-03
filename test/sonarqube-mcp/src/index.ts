/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Environment variables should be passed by the client or set in the environment
const SONAR_URL = process.env.SONAR_URL || "http://localhost:9000";
const SONAR_TOKEN = process.env.SONAR_TOKEN || "";

const server = new Server(
  {
    name: "sonarqube-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_project_status",
        description: "Get the quality gate status of a SonarQube project",
        inputSchema: {
          type: "object",
          properties: {
            projectKey: {
              type: "string",
              description: "The key of the project in SonarQube",
            },
          },
          required: ["projectKey"],
        },
      },
      {
        name: "search_issues",
        description: "Search for issues in a SonarQube project",
        inputSchema: {
          type: "object",
          properties: {
            projectKey: {
              type: "string",
              description: "The key of the project",
            },
            severities: {
              type: "string",
              description: "Comma-separated list of severities (e.g., BLOCKER,CRITICAL)",
            },
          },
          required: ["projectKey"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!SONAR_TOKEN) {
    return {
      content: [
        {
          type: "text",
          text: "Error: SONAR_TOKEN is not set. Please configure it in your MCP settings.",
        },
      ],
      isError: true,
    };
  }

  const auth = {
    username: SONAR_TOKEN,
    password: "",
  };

  try {
    if (request.params.name === "get_project_status") {
      const { projectKey } = request.params.arguments as { projectKey: string };
      const response = await axios.get(
        `${SONAR_URL}/api/qualitygates/project_status?projectKey=${projectKey}`,
        { auth }
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } else if (request.params.name === "search_issues") {
      const { projectKey, severities } = request.params.arguments as {
        projectKey: string;
        severities?: string;
      };
      
      let url = `${SONAR_URL}/api/issues/search?componentKeys=${projectKey}`;
      if (severities) {
        url += `&severities=${severities}`;
      }

      const response = await axios.get(url, { auth });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    } else {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `SonarQube API Error: ${error.message}${
            error.response ? "\n" + JSON.stringify(error.response.data) : ""
          }`,
        },
      ],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SonarQube MCP server running on stdio");
}

run();
