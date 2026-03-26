"use client";

import React from "react";
import {
  DocSection,
  DocSubsection,
  DocParagraph,
  CodeBlock,
  InlineCode,
  DocTable,
  DocNote,
} from "../DocSection";

export function BasicSyntaxSection() {
  return (
    <>
      <DocSection title="Basic Syntax">
        <DocSubsection title="Indentation">
          <DocParagraph>
            Verdant uses indentation to define scope. Properties of a node, edge, or group must be indented deeper than the declaration line.
          </DocParagraph>
          <CodeBlock
            code={`server api:
  label: "API Gateway"
  color: #52B788
  size: lg`}
          />
          <DocNote>
            Spaces are recommended (2-space indent is conventional). Tabs are accepted but normalized to 2 spaces with an info diagnostic.
          </DocNote>
        </DocSubsection>

        <DocSubsection title="Comments">
          <DocParagraph>
            Line comments start with <InlineCode>#</InlineCode>. Inline comments are supported and respect quoted strings.
          </DocParagraph>
          <CodeBlock
            code={`# This is a full-line comment
server api   # This is an inline comment
database db:
  label: "User DB"   # This comment won't break the string`}
          />
        </DocSubsection>

        <DocSubsection title="Separators">
          <DocParagraph>
            A line containing only <InlineCode>---</InlineCode> is treated as a visual separator and ignored by the parser. Use it to organize sections.
          </DocParagraph>
          <CodeBlock
            code={`layout: hierarchical

---

server api
database db

---

api -> db`}
          />
        </DocSubsection>

        <DocSubsection title="Blank Lines">
          <DocParagraph>
            Blank lines are ignored. Use them freely for readability.
          </DocParagraph>
        </DocSubsection>

        <DocSubsection title="Values">
          <DocParagraph>
            Property values are automatically parsed into typed values:
          </DocParagraph>
          <DocTable
            headers={["Syntax", "Parsed Type", "Example"]}
            rows={[
              [<InlineCode key="1">"text"</InlineCode>, "String", <InlineCode key="2">label: "Web Server"</InlineCode>],
              [<InlineCode key="3">true / false</InlineCode>, "Boolean", <InlineCode key="4">glow: true</InlineCode>],
              [<InlineCode key="5">42 / 3.14</InlineCode>, "Number", <InlineCode key="6">width: 2.5</InlineCode>],
              [<InlineCode key="7">null / none</InlineCode>, "Null", <InlineCode key="8">icon: none</InlineCode>],
              [<InlineCode key="9">#52B788</InlineCode>, "String (hex)", <InlineCode key="10">color: #52B788</InlineCode>],
              ["anything else", "String", <InlineCode key="11">status: healthy</InlineCode>],
            ]}
          />
          <DocNote>
            Hex colors starting with # are kept as strings and not parsed as numbers.
          </DocNote>
        </DocSubsection>
      </DocSection>
    </>
  );
}
