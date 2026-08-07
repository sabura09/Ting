import { getSidebarToolsCount } from "./sidebar-routes";

// Total tool count - calculated from features
export const TOTAL_TOOLS_COUNT = getSidebarToolsCount();

// Display string for tool count
export const TOOLS_COUNT_DISPLAY = `${TOTAL_TOOLS_COUNT}+`;

// App metadata
export const APP_NAME = "Ai Suite";

export const APP_TAGLINE = "Your AI-Powered Productivity Platform";

export const APP_VERSION = "7.0.0";
