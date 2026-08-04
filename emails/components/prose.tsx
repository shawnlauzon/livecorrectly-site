import * as React from 'react';
import { Text } from 'react-email';

interface ProseProps {
  content: string;
  className?: string;
}

/**
 * Renders a template-literal string as a sequence of paragraphs and bullet lists.
 *
 * Conventions (same as markdown/plain text):
 * - Blank lines separate blocks
 * - Lines starting with `- ` are list items; consecutive ones form a single <ul>
 *
 * Uses inline styles on <ul>/<li> because email clients strip CSS classes on
 * list elements.
 */
export function Prose({
  content,
  className = 'mb-[16px] text-[16px] leading-[24px] text-[#4A4A4A]'
}: ProseProps) {
  const blocks = content.split(/\n\n+/);

  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const isList = lines.every((line) => line.startsWith('- '));

        if (isList) {
          return (
            <ul
              key={i}
              style={{
                margin: '0 0 16px 0',
                padding: '0 0 0 24px',
                color: '#4A4A4A',
                fontSize: '16px',
                lineHeight: '24px'
              }}
            >
              {lines.map((line, j) => (
                <li key={j} style={{ marginBottom: '8px' }}>
                  {line.slice(2)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <Text key={i} className={className}>
            {block}
          </Text>
        );
      })}
    </>
  );
}
