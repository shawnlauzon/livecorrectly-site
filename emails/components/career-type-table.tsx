import * as React from 'react';
import { Text, Section, Row, Column } from 'react-email';

/**
 * Inline summary table of the 4 career types.
 * Used in welcome1 to provide context before revealing the subscriber's type.
 *
 * Note: The original HTML doesn't have this as a separate table — the types are
 * explained inline. This component isn't used in the current templates but is
 * available if needed for future emails.
 */

interface CareerTypeHighlightProps {
  number: string;
  title: string;
  description: string;
}

export function CareerTypeHighlight({
  number,
  title,
  description
}: CareerTypeHighlightProps) {
  return (
    <Section>
      <Row>
        <Column className="w-[40px] align-baseline">
          <table className="text-center">
            <tbody>
              <tr>
                <td
                  align="center"
                  className="h-[40px] w-[40px] rounded-full bg-[#E6E1F4] p-0"
                >
                  <Text className="m-0 font-serif text-[#6A4BD6]">{number}</Text>
                </td>
              </tr>
            </tbody>
          </table>
        </Column>
        <Column className="w-[85%]">
          <Text className="m-0 text-[20px] font-serif leading-[28px] text-[#221B3D]">
            {title}
          </Text>
          <Text className="m-0 mt-[8px] text-[16px] leading-[24px]">
            {description}
          </Text>
        </Column>
      </Row>
    </Section>
  );
}
