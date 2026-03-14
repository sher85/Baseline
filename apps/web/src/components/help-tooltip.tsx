"use client";

import * as Tooltip from "@radix-ui/react-tooltip";

type HelpTooltipProps = {
  content: string;
};

export function HelpTooltip({ content }: HelpTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={120}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="metric-help"
            aria-label={content}
          >
            ?
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={10}
            className="help-tooltip-content"
          >
            {content}
            <Tooltip.Arrow className="help-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
