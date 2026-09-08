import * as React from 'react';
import { Text } from 'react-email';

/**
 * Styled pull quote with grape left border.
 * Use for callouts and emphasized quotes in email templates.
 */
export function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <Text className="my-[16px] border-l-[3px] border-l-[#8C4A6B] pl-[16px] text-[16px] leading-[24px] italic text-[#45585B]">
      {children}
    </Text>
  );
}
